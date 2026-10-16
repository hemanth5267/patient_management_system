const escapeText = value => String(value ?? "");

function setStatus(element, message, type = "") {
    element.textContent = message;
    element.className = `status${type ? ` ${type}` : ""}`;
}

function createPatientCell(patient) {
    const cell = document.createElement("div");
    cell.className = "patient-cell";

    const avatar = document.createElement("span");
    avatar.className = "patient-avatar";
    avatar.textContent = escapeText(patient.patient_name).trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("");

    const details = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = escapeText(patient.patient_name) || "Unnamed patient";
    const id = document.createElement("small");
    id.textContent = `ID ${escapeText(patient.patient_id)}`;
    details.append(name, id);
    cell.append(avatar, details);
    return cell;
}

function appendTextCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = escapeText(value) || "—";
    row.appendChild(cell);
}

async function getPatients() {
    const response = await fetch("/patient");
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not load patient records.");
    }
    return response.json();
}

function createPatientRow(patient, includeEmail = false) {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.appendChild(createPatientCell(patient));
    row.appendChild(nameCell);
    appendTextCell(row, patient.phone_number);
    if (includeEmail) appendTextCell(row, patient.email_id);
    appendTextCell(row, patient.problem);
    appendTextCell(row, patient.room_no);

    const actionsCell = document.createElement("td");
    const edit = document.createElement("a");
    edit.className = "table-action";
    edit.href = `update-patient.html?id=${encodeURIComponent(patient.patient_id)}`;
    edit.textContent = "Edit";
    const remove = document.createElement("button");
    remove.className = "table-action danger";
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deletePatient(patient.patient_id));
    actionsCell.append(edit, remove);
    row.appendChild(actionsCell);
    return row;
}

async function loadDashboard() {
    const rows = document.getElementById("recentPatients");
    const status = document.getElementById("dashboardStatus");
    try {
        const patients = await getPatients();
        document.getElementById("totalPatients").textContent = patients.length;
        document.getElementById("roomCount").textContent = patients.filter(patient => String(patient.room_no ?? "").trim()).length;
        document.getElementById("careNoteCount").textContent = patients.filter(patient => String(patient.problem ?? "").trim()).length;
        rows.replaceChildren();
        if (!patients.length) {
            rows.innerHTML = '<tr><td colspan="5" class="empty-state">No patient records yet. Add a patient to get started.</td></tr>';
            return;
        }
        patients.slice(-5).reverse().forEach(patient => rows.appendChild(createPatientRow(patient)));
    } catch (error) {
        rows.innerHTML = '<tr><td colspan="5" class="empty-state">Patient records could not be loaded.</td></tr>';
        setStatus(status, error.message || "Check that the server and database are running, then try again.", "error");
    }
}

async function loadPatientDirectory() {
    const rows = document.getElementById("patientTable");
    const count = document.getElementById("patientCountLabel");
    const status = document.getElementById("patientsStatus");
    let patients = [];
    try {
        patients = await getPatients();
        count.textContent = `${patients.length} ${patients.length === 1 ? "record" : "records"}`;
        drawRows();
    } catch (error) {
        count.textContent = "Records unavailable";
        rows.innerHTML = '<tr><td colspan="6" class="empty-state">Patient records could not be loaded.</td></tr>';
        setStatus(status, error.message || "Check that the server and database are running, then refresh.", "error");
        return;
    }

    function drawRows() {
        const query = document.getElementById("patientSearch").value.trim().toLowerCase();
        const matches = patients.filter(patient =>
            [patient.patient_id, patient.patient_name, patient.phone_number, patient.email_id, patient.problem, patient.room_no]
                .some(value => String(value ?? "").toLowerCase().includes(query))
        );
        rows.replaceChildren();
        if (!matches.length) {
            rows.innerHTML = `<tr><td colspan="6" class="empty-state">${patients.length ? "No patients match your search." : "No patient records yet. Add one to get started."}</td></tr>`;
            return;
        }
        matches.forEach(patient => rows.appendChild(createPatientRow(patient, true)));
    }

    document.getElementById("patientSearch").addEventListener("input", drawRows);
}

async function deletePatient(patientId) {
    if (!window.confirm(`Delete patient ${patientId}? This action cannot be undone.`)) return;
    const status = document.getElementById("patientsStatus") || document.getElementById("dashboardStatus");
    try {
        const response = await fetch(`/patient/${encodeURIComponent(patientId)}`, { method: "DELETE" });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || "Could not delete patient.");
        }
        if (document.body.dataset.page === "patients") {
            setStatus(status, "Patient record deleted.", "success");
            await loadPatientDirectory();
        } else {
            setStatus(status, "Patient record deleted.", "success");
            await loadDashboard();
        }
    } catch (error) {
        setStatus(status, error.message || "Could not delete patient. Please try again.", "error");
    }
}

function patientFormData(form) {
    return Object.fromEntries(new FormData(form).entries());
}

async function setupPatientForm(editing) {
    const form = document.getElementById("patientForm");
    const status = document.getElementById("formStatus");
    const idInput = document.getElementById("patient_id");
    const queryId = new URLSearchParams(window.location.search).get("id");

    if (editing) {
        if (!queryId) {
            setStatus(status, "A patient ID is required to update a record. Open Update from the patient directory.", "error");
            document.getElementById("savePatient").disabled = true;
            return;
        }
        document.getElementById("formTitle").textContent = "Update patient";
        document.getElementById("savePatient").textContent = "Save changes";
        idInput.readOnly = true;
        try {
            const response = await fetch(`/patient/${encodeURIComponent(queryId)}`);
            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Could not find this patient.");
            }
            const patients = await response.json();
            if (!patients.length) throw new Error("Patient not found.");
            for (const [key, value] of Object.entries(patients[0])) {
                if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value ?? "";
            }
        } catch (error) {
            setStatus(status, error.message || "Could not load this patient record.", "error");
            document.getElementById("savePatient").disabled = true;
            return;
        }
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        setStatus(status, "");
        const body = patientFormData(form);
        const url = editing ? `/patient/${encodeURIComponent(queryId)}` : "/patient";
        try {
            const response = await fetch(url, {
                method: editing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Could not save patient.");
            }
            window.location.assign("patients.html");
        } catch (error) {
            setStatus(status, error.message || "Could not save patient. Please try again.", "error");
        }
    });
}

const page = document.body.dataset.page;
if (page === "dashboard") loadDashboard();
if (page === "patients") loadPatientDirectory();
if (page === "add") setupPatientForm(false);
if (page === "update") setupPatientForm(true);
