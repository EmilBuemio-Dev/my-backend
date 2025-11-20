import mongoose from "mongoose";

const TicketChatSchema = new mongoose.Schema({
  ticketId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Ticket", 
    required: true 
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  senderRole: { 
    type: String, 
    enum: ["client", "hr", "admin"], 
    required: true 
  },
  senderName: { 
    type: String, 
    required: true 
  },
  senderEmail: { 
    type: String 
  },
  message: { 
    type: String, 
    required: true 
  },
  readBy: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      readAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model("TicketChat", TicketChatSchema);


// ===== TICKET CHAT ROUTES (ticketChatRoutes.js) =====
import express from "express";
import TicketChat from "../models/TicketChat.js";
import Ticket from "../models/Ticket.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// ===============================
// POST MESSAGE TO TICKET CHAT
// ===============================
router.post("/:ticketId/messages", authMiddleware, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userRole = req.user.role;
    const userName = req.user.name || req.user.email;

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    // Verify ticket exists
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Verify user has access to this ticket
    const isCreator = ticket.creatorId.toString() === userId;
    const isHRAdmin = userRole === "hr" || userRole === "admin";

    if (!isCreator && !isHRAdmin) {
      return res.status(403).json({ message: "Access denied to this ticket chat" });
    }

    // Create chat message
    const chatMessage = new TicketChat({
      ticketId,
      senderId: userId,
      senderRole: userRole,
      senderName: userName,
      senderEmail: userEmail,
      message: message.trim(),
    });

    await chatMessage.save();

    res.status(201).json({
      message: "Message sent successfully",
      chat: chatMessage,
    });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({
      message: "Failed to send message",
      error: err.message,
    });
  }
});