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

// ===============================
// GET ALL MESSAGES FOR A TICKET
// ===============================
router.get("/:ticketId/messages", authMiddleware, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify ticket exists
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Verify user has access
    const isCreator = ticket.creatorId.toString() === userId;
    const isHRAdmin = userRole === "hr" || userRole === "admin";

    if (!isCreator && !isHRAdmin) {
      return res.status(403).json({ message: "Access denied to this ticket chat" });
    }

    // Get all messages sorted by date
    const messages = await TicketChat.find({ ticketId })
      .sort({ createdAt: 1 })
      .populate("senderId", "name email");

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({
      message: "Failed to fetch messages",
      error: err.message,
    });
  }
});

// ===============================
// GET UNREAD MESSAGES FOR USER
// ===============================
router.get("/unread/count", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find all tickets where this user is involved
    let query = {};
    
    if (userRole === "client") {
      // Client sees messages from HR/Admin on their tickets
      const clientTickets = await Ticket.find({ creatorId: userId });
      const ticketIds = clientTickets.map(t => t._id);
      
      query = {
        ticketId: { $in: ticketIds },
        senderRole: { $in: ["hr", "admin"] },
        "readBy.userId": { $ne: userId }
      };
    } else if (userRole === "hr" || userRole === "admin") {
      // HR/Admin sees messages from clients
      const clientTickets = await Ticket.find({ creatorRole: "client" });
      const ticketIds = clientTickets.map(t => t._id);
      
      query = {
        ticketId: { $in: ticketIds },
        senderRole: "client",
        "readBy.userId": { $ne: userId }
      };
    }

    const unreadCount = await TicketChat.countDocuments(query);

    res.json({ unreadCount });
  } catch (err) {
    console.error("Error fetching unread count:", err);
    res.status(500).json({
      message: "Failed to fetch unread count",
      error: err.message,
    });
  }
});

// ===============================
// MARK MESSAGE AS READ
// ===============================
router.patch("/:messageId/read", authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await TicketChat.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if already read
    const isAlreadyRead = message.readBy.some(r => r.userId.toString() === userId);

    if (!isAlreadyRead) {
      message.readBy.push({ userId });
      await message.save();
    }

    res.json({ message: "Message marked as read" });
  } catch (err) {
    console.error("Error marking message as read:", err);
    res.status(500).json({
      message: "Failed to mark message as read",
      error: err.message,
    });
  }
});

// ===============================
// GET UNREAD MESSAGES WITH TICKET INFO
// ===============================
router.get("/messages/unread-details", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let unreadMessages = [];

    if (userRole === "client") {
      // Get unread HR/Admin messages on client's tickets
      const clientTickets = await Ticket.find({ creatorId: userId });
      const ticketIds = clientTickets.map(t => t._id);

      unreadMessages = await TicketChat.find({
        ticketId: { $in: ticketIds },
        senderRole: { $in: ["hr", "admin"] },
        "readBy.userId": { $ne: userId }
      })
        .populate("ticketId", "subject creatorName")
        .sort({ createdAt: -1 })
        .limit(10);
    } else if (userRole === "hr" || userRole === "admin") {
      // Get unread client messages
      const clientTickets = await Ticket.find({ creatorRole: "client" });
      const ticketIds = clientTickets.map(t => t._id);

      unreadMessages = await TicketChat.find({
        ticketId: { $in: ticketIds },
        senderRole: "client",
        "readBy.userId": { $ne: userId }
      })
        .populate("ticketId", "subject creatorName")
        .sort({ createdAt: -1 })
        .limit(10);
    }

    res.json(unreadMessages);
  } catch (err) {
    console.error("Error fetching unread message details:", err);
    res.status(500).json({
      message: "Failed to fetch unread messages",
      error: err.message,
    });
  }
});

export default router;