import mongoose from "mongoose";

const enterpriseAuditSchema = new mongoose.Schema({
  actorType: { type: String, required: true }, // admin, operator, system, paymentGateway
  actorId: { type: mongoose.Schema.Types.ObjectId },
  action: { type: String, required: true }, // package.create, purchase.approve, operator.create, employee.create
  details: { type: mongoose.Schema.Types.Mixed }, // Arbitrary JSON object
  entityType: { type: String, required: true }, // EnterprisePackage, EnterprisePurchase, Operator, User
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
});

enterpriseAuditSchema.index({ actorId: 1 });
enterpriseAuditSchema.index({ entityType: 1, entityId: 1 });
enterpriseAuditSchema.index({ createdAt: -1 });

const EnterpriseAuditModel = mongoose.model(
  "EnterpriseAudit",
  enterpriseAuditSchema,
);

export default EnterpriseAuditModel;
