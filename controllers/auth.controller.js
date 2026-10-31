import crypto from "crypto";
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";
import { sendMail } from "../utils/mail.js";

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function sendResetEmail(user, token) {
  const resetUrl = `${process.env.ADMIN_URL || "https://thaili-admin.vercel.app/"}/reset-password/${token}`;
  await sendMail({
    to: user.email,
    subject: "Reset your Thaili password",
    text: `Reset your password using this link. It expires in 15 minutes: ${resetUrl}`,
    html: `<p>Reset your Thaili password using the link below.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 15 minutes.</p>`,
  });
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function signup(req, res, next) {
  try {
    const { name, email, phone, contactNumber, password } = req.body;
    const userPhone = phone || contactNumber;

    if (!name || !email || !userPhone || !password) {
      return res.status(400).json({
        message: "Name, email, contact number and password are required",
      });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: userPhone,
      password,
      role: "customer",
    });
    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = hashResetToken(resetToken);
      user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save({ validateBeforeSave: false });
      await sendResetEmail(user, resetToken);
    }

    res.json({
      message: "If an account exists with that email, a reset link has been sent",
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findOne({
      resetPasswordToken: hashResetToken(req.params.token),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: "Reset token is invalid or expired" });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
}

export function getMe(req, res) {
  res.json({ user: req.user });
}

export function adminCheck(req, res) {
  res.json({ ok: true, user: req.user });
}
