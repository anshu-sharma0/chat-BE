const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User'); // adjust the path as needed

// Create or get conversation

router.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error while retrieving users' });
    }
});


router.post('/conversation', async (req, res) => {
  const { user1, user2 } = req.body;

  let conversation = await Conversation.findOne({
    participants: { $all: [user1, user2] }
  });

  if (!conversation) {
    conversation = new Conversation({ participants: [user1, user2] });
    await conversation.save();
  }

  res.json(conversation);
});

// Send message
router.post('/message', async (req, res) => {
  const { conversationId, senderId, message } = req.body;

  const newMessage = new Message({ conversationId, senderId, message });
  await newMessage.save();

  res.json(newMessage);
});

// Get messages
router.get('/messages/:conversationId', async (req, res) => {
  const messages = await Message.find({ conversationId: req.params.conversationId }).sort({ timestamp: 1 });
  res.json(messages);
});

module.exports = router;
