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
  kind: { type: String },
  make: { type: String },
  sn: { type: String }
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
  dateOfBirth: { type: Date, default: null },
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
  status: { 
    type: String, 
    enum: ["Active", "Expired", "Pending"],
    default: "Active" 
  },
  expiryDate: { 
    type: Date, 
    default: null,
    set: function(val) {
      // Convert "N/A" or empty strings to null
      if (!val || val === "N/A" || val.toString().trim() === "") {
        return null;
      }
      return val;
    }
  },
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
    firearmsIssued: [firearmsIssuedSchema],
    credentials: credentialsSchema
  }
}, { timestamps: true });

const Employee = mongoose.model("Employee", employeeSchema);
export default Employee;