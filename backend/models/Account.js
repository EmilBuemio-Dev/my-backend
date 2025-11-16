// models/Account.js
import mongoose from "mongoose";

const educationSchema = new mongoose.Schema({
  school: String,
  inclusiveDate: String,
  degree: String,
  dateGraduated: String,
});

const firearmsSchema = new mongoose.Schema({
  kind: { type: String, default: "N/A" },
  make: { type: String, default: "N/A" },
  sn: { type: String, default: "N/A" },
});

const basicInformationSchema = new mongoose.Schema({
  pslNo: String,
  sssNo: String,
  tinNo: String,
  celNo: String,
  shift: String,
  expiryDate: String,
  badgeNo: String,
  salary: String,
  branch: {
    type: String,
    default: null,
  },
}, { _id: false });

const personalDataSchema = new mongoose.Schema({
  familyName: String,
  firstName: String,
  middleName: String,
  email: String,
  dateOfBirth: Date,
  presentAddress: String,
  placeOfBirth: String,
  prevAddress: String,
  citizenship: String,
  weight: String,
  languageSpoken: String,
  age: {
    type: Number,
    default: 0,
  },
  height: String,
  religion: String,
  civilStatus: String,
  colorOfHair: String,
  colorOfEyes: String,
}, { _id: false });

const employeeDataSchema = new mongoose.Schema({
  basicInformation: basicInformationSchema,
  personalData: personalDataSchema,
  educationalBackground: [educationSchema],
  credentials: { type: mongoose.Schema.Types.Mixed, default: {} },
  firearmsIssued: [firearmsSchema],
}, { _id: false });

const clientDataSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  branch: String,
  guardShift: { type: mongoose.Schema.Types.Mixed },
  contract: String,
  credentials: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const accountSchema = new mongoose.Schema(
  {
    role: { 
      type: String, 
      required: true,
      enum: ["employee", "client"],
      index: true 
    },
    status: { 
      type: String, 
      default: "Pending",
      enum: ["Pending", "Approved", "Rejected"],
      index: true 
    },
    employeeData: employeeDataSchema,
    clientData: clientDataSchema,
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ INDEX for faster pending/approved queries
accountSchema.index({ 
  role: 1, 
  status: 1, 
  "employeeData.basicInformation.branch": 1 
});

// ✅ HELPER FUNCTION (same as backend)
function isValidBranch(branch) {
  if (!branch) return false;
  const invalidValues = ["toBeSet", "N/A", "", null, undefined];
  return !invalidValues.includes(branch);
}

// ✅ VIRTUAL: Check if account is pending (no valid branch)
accountSchema.virtual("isPending").get(function () {
  if (this.role !== "employee") return false;
  
  const branch = this.employeeData?.basicInformation?.branch;
  return !isValidBranch(branch);
});

// ✅ VIRTUAL: Check if account is approved (has valid branch)
accountSchema.virtual("isApproved").get(function () {
  if (this.role !== "employee") return false;
  
  const branch = this.employeeData?.basicInformation?.branch;
  return isValidBranch(branch);
});


const Account = mongoose.model("Account", accountSchema);
export default Account;