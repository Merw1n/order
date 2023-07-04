const Company = require("../models/company");
const Conversation = require("../models/conversation");
const User = require("../models/user");
module.exports = {
  createOne: async (req, res) => {
    const populatedUser = await req.user.populate("company");
    const senderIndustryRole = populatedUser.company.industryRole;
    const senderId = req.user._id.toString();
    let receiverId = null;
    let receivingCompanyIndustryRole;
    if (req.body.companyId) {
      const company = await Company.findById(req.body.companyId).populate(
        "users"
      );
      if (!company) {
        return res
          .status(400)
          .json({ status: "error", message: "Ungültige Firmen-ID" });
      }
      receiverId = company.users[0]._id.toString();
      receivingCompanyIndustryRole = company.industryRole;
    } else {
      if (!req.body.receiverId) {
        return res.status(400).json({
          status: "error",
          message: "Fehlende Empfänger-ID",
        });
      }
      receiverId = req.body.receiverId;
      // verify user existing
      const user = await User.findById(receiverId);
      if (!user) {
        return res.status(400).json({
          status: "error",
          message: "Dieser Benutzer existiert nicht",
        });
      }
    }
    // verify user not the same as sender
    if (senderId === receiverId) {
      return res.status(400).json({
        status: "error",
        message: "Sie dürfen keine Nachricht an sich selbst senden",
      });
    }
    // verify not both members are einkäufer
    if (
      senderIndustryRole === "Einkäufer" &&
      receivingCompanyIndustryRole === "Einkäufer"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Sie dürfen keinen Einkäufer kontaktieren",
      });
    }
    //
    const existingConversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    }).populate({
      path: "members",
      populate: { path: "company" },
    });
    let untrimmedPartner;
    if (existingConversation) {
      untrimmedPartner = existingConversation.members.find(
        (m) => m._id.toString() !== req.user._id.toString()
      );
      return res.status(200).json({
        status: "success",
        data: {
          conversation: {
            ...existingConversation._doc,
            members: undefined,
            hasUnreadMsgs: undefined,
            checked: true,
            partner: {
              firstName: untrimmedPartner.firstName,
              lastName: untrimmedPartner.lastName,
              companyName: untrimmedPartner.company.name,
            },
          },
        },
      });
    }

    const newConversation = new Conversation({
      members: [senderId, receiverId],
    });
    await newConversation.save();
    await newConversation.populate({
      path: "members",
      populate: { path: "company" },
    });
    untrimmedPartner = newConversation.members.find(
      (m) => m._id.toString() !== req.user._id.toString()
    );
    res.status(200).json({
      status: "success",
      data: {
        conversation: {
          ...newConversation._doc,
          members: undefined,
          hasUnreadMsgs: undefined,
          checked: true,
          partner: {
            firstName: untrimmedPartner.firstName,
            lastName: untrimmedPartner.lastName,
            companyName: untrimmedPartner.company.name,
          },
        },
      },
    });
  },

  // end of create one

  getOneUserAll: async (req, res) => {
    const conversations = await Conversation.find({
      members: { $in: [req.user._id] },
    })
      .populate({ path: "members", populate: { path: "company" } })
      .populate("lastMessage")
      .sort("-updatedAt");

    const trimmedConversations = conversations.map((c) => {
      const untrimmedPartner = c.members.find(
        (m) => m._id.toString() !== req.user._id.toString()
      );
      // console.log(untrimmedPartner);
      return {
        ...c._doc,
        members: undefined,
        hasUnreadMsgs: undefined,
        checked: !c.hasUnreadMsgs.includes(req.user._id.toString()),
        partner: {
          firstName: untrimmedPartner.firstName,
          lastName: untrimmedPartner.lastName,
          companyName: untrimmedPartner.company.name,
        },
      };
    });
    res.status(200).json({
      status: "success",
      data: { conversations: trimmedConversations },
    });
  },
  markChecked: async (params) => {
    const { conversationId, userId } = params;
    const conversation = await Conversation.findById(conversationId);
    conversation.hasUnreadMsgs = conversation.hasUnreadMsgs.filter(
      (m) => m.toString() !== userId.toString()
    );
    await conversation.save({ timestamps: false });
  },
};
