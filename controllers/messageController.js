const Message = require("../models/message");
const Conversation = require("../models/conversation");
const conversationController = require("../controllers/conversationController");

module.exports = {
  addOne: async (req, res) => {
    const { conversation: conversationId, body, type } = req.body;
    const sender = req.user._id;
    // validate for empty msgs
    if (!body) {
      return res
        .status(400)
        .json({ status: "error", message: "Nachrichtentext ist erforderlich" });
    }
    const conversation = await Conversation.findById(conversationId).populate({
      path: "members",
      populate: { path: "company" },
    });
    // console.log(typeof conversation.members);
    if (!conversation) {
      return res
        .status(400)
        .json({ status: "error", message: "Ungültige Gesprächsnummer" });
    }

    const foundMember = conversation.members.find(
      (m) => m._id.toString() === sender.toString()
    );
    if (!foundMember) {
      return res
        .status(403)
        .json({ status: "error", message: "Unbefugte Anfrage" });
    }

    const untrimmedPartner = conversation.members.find(
      (m) => m._id.toString() !== req.user._id.toString()
    );
    const partnerId = untrimmedPartner._id.toString();

    const msgBody = {
      conversation: conversationId,
      sender,
      type,
      body,
    };
    const newMessage = new Message(msgBody);
    let savedMessage;
    let savedConv;
    try {
      savedMessage = await newMessage.save();
      conversation.lastMessage = savedMessage;
      // check if partnerId is already in the hasUnreadMsgs arr, and push it in the arr if not
      if (!conversation.hasUnreadMsgs.find((m) => m.toString() === partnerId)) {
        conversation.hasUnreadMsgs.push(partnerId);
      }
      savedConv = await conversation.save();
    } catch (e) {
      res.status(500).json({ status: "error", message: e });
    }
    const formattedMessage = {
      ...savedMessage._doc,
      conversation: {
        ...savedConv._doc,
        members: undefined,
        partner: {
          firstName: untrimmedPartner.firstName,
          lastName: untrimmedPartner.lastName,
          companyName: untrimmedPartner.company.name,
        },
      },
    };
    // console.log({ formattedMessage });
    // await savedMessage.populate("conversation");
    global.io.to(partnerId).emit("new-message", formattedMessage);
    res.status(200).json({ status: "success", message: formattedMessage });
  },

  getConversationAllMessages: async (req, res) => {
    const conversationId = req.params.id;
    const sender = req.user._id;
    // check if conv id exist
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res
        .status(400)
        .json({ status: "error", message: "Ungültige Gesprächsnummer" });
    }
    // check if user is included in conv members
    if (!conversation.members.includes(sender)) {
      return res
        .status(403)
        .json({ status: "error", message: "Unbefugte Anfrage" });
    }

    //
    await conversationController.markChecked({
      conversationId,
      userId: sender.toString(),
    });
    const messages = await Message.find({
      conversation: conversationId,
    });
    res.status(200).json({ status: "success", data: { messages } });
  },
};
