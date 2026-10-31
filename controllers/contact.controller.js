import { Contact } from "../models/Contact.js";

export async function createContact(req, res, next) {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: "Name, email, subject and message are required",
      });
    }

    const contact = await Contact.create({
      name,
      email,
      phone: phone || "",
      subject,
      message,
    });

    res.status(201).json({
      message: "Your message has been received. We will reply shortly.",
      contactId: contact._id,
    });
  } catch (error) {
    next(error);
  }
}

export async function getContacts(req, res, next) {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    next(error);
  }
}

export async function getContact(req, res, next) {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  } catch (error) {
    next(error);
  }
}

export async function updateContactStatus(req, res, next) {
  try {
    const allowed = ["new", "read", "replied", "archived"];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid contact status" });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true },
    );
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  } catch (error) {
    next(error);
  }
}

export async function deleteContact(req, res, next) {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json({ message: "Contact deleted" });
  } catch (error) {
    next(error);
  }
}
