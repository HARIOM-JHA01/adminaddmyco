import mongoose from "mongoose";

const donatorAuditSchema = new mongoose.Schema({
  actorType: { type: String, required: true }, // admin, operator, system, paymentGateway
  actorId: { type: mongoose.Schema.Types.ObjectId },
  action: { type: String, required: true }, // package.create, purchase.approve, operator.create, employee.create
  details: { type: mongoose.Schema.Types.Mixed }, // Arbitrary JSON object
  entityType: { type: String, required: true }, // DonatorPackage, DonatorPurchase, Operator, User
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
});

donatorAuditSchema.index({ actorId: 1 });
donatorAuditSchema.index({ entityType: 1, entityId: 1 });
donatorAuditSchema.index({ createdAt: -1 });

const DonatorAuditModel = mongoose.model("DonatorAudit", donatorAuditSchema);

export default DonatorAuditModel;
