import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    groupName: {
      type: String,
      trim: true,
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const Group = mongoose.model('Group', groupSchema);

export default Group;
