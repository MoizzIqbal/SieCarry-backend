import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  createContact,
  deleteContact,
  getContact,
  getContacts,
  updateContactStatus,
} from "../controllers/contact.controller.js";

const router = Router();

router.post("/", createContact);

router.use(protect, adminOnly);

router.get("/", getContacts);

router.get("/:id", getContact);

router.patch("/:id/status", updateContactStatus);

router.delete("/:id", deleteContact);

export default router;
