import mongoose from "mongoose";
import { setImageUrl } from "../Common.js";

const userSchema = new mongoose.Schema(
  {
    firstname: { type: String },
    lastname: { type: String },
    username: { type: String },
    freeUsername: { type: String }, // Always contains the random generated username
    staffUserName: { type: String }, // Core username for staff users (same as username and tgid)
    tgid: { type: String },
    email: { type: String },
    password: { type: String },
    photo: { type: String },
    token: { type: String },
    otp: { type: Number },
    country: { type: String },
    countryCode: { type: String },
    memberid: { type: String },
    membertype: { type: String },
    membershiperiod: { type: String },
    joindate: { type: String },
    paid: { type: Number },
    contact: { type: Number },
    address: { type: String },
    fcmtoken: { type: String },
    owner_name_english: { type: String },
    owner_name_chinese: { type: String },
    telegramId: { type: String, trim: true },
    email: { type: String },
    contact: { type: Number },
    address1: { type: String },
    address2: { type: String },
    address3: { type: String },
    WhatsApp: { type: String },
    WeChat: { type: String },
    Line: { type: String },
    Instagram: { type: String },
    Facebook: { type: String },
    Twitter: { type: String },
    Youtube: { type: String },
    Linkedin: { type: String },
    SnapChat: { type: String },
    Skype: { type: String },
    TikTok: { type: String },
    tags: { type: String },
    count: { type: Number, default: 0 },
    usertype: { type: Number, default: 0 },
    languagetype: { type: Number, default: 1 },
    profilestatus: { type: Number, default: 0 },
    companystatus: { type: Number, default: 0 },
    profile_image: { type: String, trim: true, get: setImageUrl },
    video: { type: String, trim: true, get: setImageUrl },
    enddate: { type: String, default: null },
    startdate: { type: String, default: null },
    paymentstatus: { type: Number, default: null },
    date: { type: Date, default: Date.now },
    isReferral: { type: Number, default: 0 },
    refstatue: { type: Number, default: 0 },
    refimgstatue: { type: Number, default: 0 },
    logoImage: { type: String },
    logoTelegramUrl: { type: String },
    referralType: { type: Number, default: 0 },
    paymentBy: { type: Number, default: 0 },
    // If this user was created by an Operator, set that operator's id here
    createdByOperator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      index: true,
    },
    // Enterprise credits (for usertype=2 enterprises to assign to operators)
    credits: { type: Number, default: 0 },
    // Date when user became an enterprise
    enterpriseOnDate: { type: Date, default: null },
    // For 3-stage creation: 0 = not started, 1 = stage 1 complete (telegram), 2 = stage 2 complete (profile), 3 = stage 3 complete (company)
    creationStage: { type: Number, default: 0 },
    // User's selected background image (set via POST /backgroundimage with Thumbnail)
    background_image: { type: String, default: null },
    // Staff verification code (6 char alphanumeric)
    verificationCode: { type: String, default: null },
    // Staff verification status (becomes true after first successful login)
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

//  Compiling Schema
userSchema.set("toObject", { getters: true });
userSchema.set("toObject", { getters: true });
userSchema.set("toJSON", { getters: true });

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
