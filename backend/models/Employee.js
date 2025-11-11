import mongoose from "mongoose";

// === EDUCATIONAL BACKGROUND ===
const educationalBackgroundSchema = new mongoose.Schema({
  school: { type: String },
  inclusiveDate: { type: String },
  degree: { type: String },
  dateGraduated: { type: String },
}, { _id: true });

// === FIREARMS ISSUED ===
const firearmsIssuedSchema = new mongoose.Schema({
  kind: { type: String },       // e.g. "9mm Pistol", "Shotgun"
  make: { type: String },
  sn: { type: String }// optional notes or condition
}, { _id: true });

// === CREDENTIALS ===
const credentialsSchema = new mongoose.Schema({
  barangayClearance: { type: String },
  policeClearance: { type: String },
  diClearance: { type: String },
  nbiClearance: { type: String },
  personalHistory: { type: String },
  residenceHistory: { type: String },
  maritalStatus: { type: String },
  physicalData: { type: String },
  educationData: { type: String },
  characterReference: { type: String },
  employmentHistory: { type: String },
  neighborhoodInvestigation: { type: String },
  militaryRecord: { type: String },
  profileImage: { type: String }
}, { _id: true });

// === PERSONAL DATA ===
const personalDataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  dateOfBirth: { type: Date },
  presentAddress: { type: String },
  placeOfBirth: { type: String },
  prevAddress: { type: String },
  citizenship: { type: String },
  weight: { type: String },
  languageSpoken: { type: String },
  age: { type: Number },
  height: { type: String },
  religion: { type: String },
  civilStatus: { type: String },
  colorOfHair: { type: String },
  colorOfEyes: { type: String }
}, { _id: false });

// === BASIC INFORMATION ===
const basicInformationSchema = new mongoose.Schema({
  pslNo: { type: String },
  sssNo: { type: String },
  tinNo: { type: String },
  celNo: { type: String },
  shift: { type: String },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  expiryDate: { type: Date },
  badgeNo: { type: String, trim: true },
  salary: { type: String },
  branch: { type: String }
}, { _id: false });

// === EMPLOYEE ===
const employeeSchema = new mongoose.Schema({
  role: { type: String, default: "employee" },
  employeeData: {
    basicInformation: basicInformationSchema,
    personalData: personalDataSchema,
    educationalBackground: [educationalBackgroundSchema],
    firearmsIssued: [firearmsIssuedSchema],  // ✅ Added here
    credentials: credentialsSchema
  }
}, { timestamps: true });

const Employee = mongoose.model("Employee", employeeSchema);
export default Employee;
