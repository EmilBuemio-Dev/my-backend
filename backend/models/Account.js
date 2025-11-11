// models/Account.js
import mongoose from "mongoose";

const educationSchema = new mongoose.Schema({
  school: String,
  inclusiveDate: String,
  degree: String,
  dateGraduated: String,
});

const employeeDataSchema = new mongoose.Schema({
  basicInformation: {
    pslNo: String,
    sssNo: String,
    tinNo: String,
    celNo: String,
    shift: String,
    expiryDate: Date,
    badgeNo: String,
    salary: String,
    branch: String,
  },
  personalData: {
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
    age: Number,
    height: String,
    religion: String,
    civilStatus: String,
    colorOfHair: String,
    colorOfEyes: String,
  },
  educationalBackground: [educationSchema],
  credentials: { type: mongoose.Schema.Types.Mixed, default: {} },
  firearmsIssued: [
    {
      kind: { type: String, default: "N/A" },
      make: { type: String, default: "N/A" },
      sn: { type: String, default: "N/A" },
    }
  ]
});


const clientDataSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String, // hashed if needed
  branch: String,
  guardShift: { type: mongoose.Schema.Types.Mixed }, // e.g., { day: "", night: "" }
  contract: String, // file path
  credentials: { type: mongoose.Schema.Types.Mixed, default: {} },
});

const accountSchema = new mongoose.Schema({
  role: { type: String, required: true }, // "employee" or "client"
  status: { type: String, default: "Pending" },
  employeeData: { type: employeeDataSchema }, // only for employees
  clientData: { type: clientDataSchema },     // only for clients
}, { timestamps: true });



const Account = mongoose.model("Account", accountSchema);
export default Account;
