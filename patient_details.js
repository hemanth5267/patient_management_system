const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const app = express();
app.use(express.json());
// Serve the patient management pages and their static assets.
app.use(express.static(path.join(__dirname, "html")));

const databaseConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};
const missingDatabaseConfig = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]
    .filter(name => process.env[name] === undefined);

if (missingDatabaseConfig.length) {
    throw new Error(`Missing required database environment variables: ${missingDatabaseConfig.join(", ")}`);
}

//Connection establishment with hospital database
const db = mysql.createConnection({
    ...databaseConfig
});

db.connect((err)=>{
    if(err)
        throw err;
    console.log("Connected to MySQL");
});

//TO GET DETAILS OF ALL PATIENTS
app.get("/patient",(req,res)=>{

    db.query(
        "SELECT * FROM patient",
        (err,result)=>{

            if(err) throw err;

            res.json(result);

        });
});

//TO GET THE DETAILS OF ONE PATIENT
app.get("/patient/:pid",(req,res)=>{

    db.query(
        "SELECT * FROM patient WHERE patient_id=?",
        [req.params.pid],
        (err,result)=>{

            if(err) throw err;

            res.json(result);

        });

});

//TO INSERT PATIENT DATA INTO patient TABLE
app.post("/patient",(req,res)=>{
    const {patient_id,patient_name,phone_number,email_id,address,problem,room_no}=req.body;
    db.query(
        "INSERT INTO patient(patient_id,patient_name,phone_number,email_id,address,problem,room_no) VALUES(?,?,?,?,?,?,?)",
        [patient_id,patient_name,phone_number,email_id,address,problem,room_no],
        (err)=>{
            if(err)
            {   res.status(500).send(err.message);
                return;
            }
            res.send("Patient Inserted");
        });

});

//TO UPDATE PATIENT DETAILS
app.put("/patient/:pid",(req,res)=>{

    const {patient_name,phone_number,email_id,address,problem,room_no}=req.body;

    db.query(
        "UPDATE patient SET patient_name=?, phone_number=?, email_id=?, address=?, problem=?, room_no=? WHERE patient_id=?",
        [patient_name,phone_number,email_id,address,problem,room_no,req.params.pid],
        (err,result)=>{

            if(err)
            {
                res.status(500).send(err.message);
                return;
            }

            if(result.affectedRows==0)
                res.status(404).send("Patient NOT found");
            else
                res.send("Patient Updated");

        });

});
//TO DELETE PATIENT DETAILS
app.delete("/patient/:pid",(req,res)=>{
    db.query(
        "DELETE FROM patient WHERE patient_id=?",
        [req.params.pid],
        (err,result)=>{
            if(err)
            {
                res.status(500).send(err.message);
                return;
            }
            if(result.affectedRows==0)
                res.status(404).send("Patient NOT found to delete");
            else
                res.send("Patient Deleted");

        });
});
//Server to listen of port number 3000
app.listen(3000,()=>{
    console.log("Server running at http://localhost:3000");
});