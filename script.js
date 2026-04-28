// =============================================
// COLOR SETTINGS
// =============================================

// List of colors used for jobs (loops if jobs > 8)
const JOB_COLORS = [
  "#FF0000", // Ruby Red
  "#00FF41", // Emerald Green
  "#00E5FF", // Sapphire Blue
  "#FFD700", // Aztec Gold
  "#FF00FF", // Amethyst Purple
  "#FF8C00", // Carnelian Orange
  "#FFFFFF", // Diamond White
  "#7FFF00", // Peridot Lime
];

// Returns a color based on job position
function getColor(index) {
  return JOB_COLORS[index % JOB_COLORS.length];
}


// =============================================
// INITIAL JOB DATA (Now Empty)
// =============================================

// We keep the IDs (J1, J2, etc.) so the rows exist, but leave the values blank
let nextJobId = 1;
let jobs = [];

// 2. Attach Event Listeners on DOM Load (Replaces inline HTML onclick/oninput)
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("resetBtn").addEventListener("click", resetApp); // Added this
  
    buildTable(); // Initialize empty table
});


// =============================================
// TABLE MANAGEMENT (UI ↔ DATA)
// =============================================

// Builds the table from the jobs array
function buildTable() {
  let tbody = document.getElementById("tableBody");
  tbody.innerHTML = ""; // clear existing rows

  for (let i = 0; i < jobs.length; i++) {
    let color = getColor(i); // assign color per job
    let row   = document.createElement("tr");

    row.innerHTML = `
      <td>
        <span class="color-dot" style="background: ${color};"></span>
        ${jobs[i].id}
      </td>
      <td>
    <input type="number" value="${jobs[i].arrival}" min="0"
        oninput="highlightIfBad(this, 'arrival')"
        onchange="updateJob(${i}, 'arrival', this.value)">
    </td>
      <td>
        <input type="number" value="${jobs[i].burst}" min="1"
          oninput="highlightIfBad(this, 'burst')"
          onchange="updateJob(${i}, 'burst', this.value)">
      </td>
      <td>
        <input type="number" value="${jobs[i].priority}" min="1"
          oninput="highlightIfBad(this, 'priority')"
          onchange="updateJob(${i}, 'priority', this.value)">
      </td>
      <td>
        <button class="del-btn" onclick="deleteJob(${i})">✕</button>
      </td>
    `;

    tbody.appendChild(row);
  }

  // Update job counter display
  document.getElementById("jobCount").textContent = jobs.length;
}

// Updates a specific job field when input changes
function updateJob(index, field, value) {
  // Convert value to a number
  let numValue = parseFloat(value);

  // Sanitization: Force whole numbers for Arrival and Burst
  if (field === 'arrival' || field === 'burst') {
    numValue = isNaN(numValue) ? "" : Math.floor(Math.abs(numValue));
  }

  jobs[index][field] = numValue;
}

// Adds a new job with default values
function addJob() {
  const newJob = { 
    id: "J" + nextJobId, 
    arrival: "", 
    burst: "", 
    priority: "" 
  };

  // 2. Increment the counter and NEVER look back
  jobs.push(newJob);
  nextJobId++;

  // 3. Update the UI
  buildTable();
  hideError();

  // 4. Animation logic (Added a safety check)
  const box = document.getElementById("jobCount");
  if (box) {
    box.classList.remove("animate-ping");
    void box.offsetWidth; 
    box.classList.add("animate-ping");
  }
}

// Removes the last job in the list
function removeJob() {
  if (jobs.length > 1) {
    // 1. Remove from the Data Model
    jobs.pop(); 
    
    // 2. Update the UI
    buildTable();
    hideError();

    const box = document.getElementById("jobCount");

    if (box) {
      box.classList.remove("animate-ping");
      void box.offsetWidth; 
      box.classList.add("animate-ping");
    }
  } 
  // ADD THIS ELSE BLOCK:
  else {
    showError("You need at least 1 job!");
  }
}


// Deletes a specific job by index
function deleteJob(index) {
  if (jobs.length <= 1) {
    showError("You need at least 1 job!");
    return;
  }
  jobs.splice(index, 1);
  buildTable();
  hideError();
}

// Reads all input values and saves them into jobs array
function saveTableData() {
  let rows = document.querySelectorAll("#tableBody tr");

  for (let i = 0; i < rows.length; i++) {
    let inputs       = rows[i].querySelectorAll("input");
    jobs[i].arrival  = parseInt(inputs[0].value);
    jobs[i].burst    = parseInt(inputs[1].value);
    jobs[i].priority = parseInt(inputs[2].value);
  }
}


// =============================================
// INPUT VALIDATION (LIVE WHILE TYPING)
// =============================================

// Highlights input red if value is invalid
function highlightIfBad(input, field) {
  let val = parseInt(input.value);

  let isBad = isNaN(val)
    || (field === "arrival"  && val < 0)
    || (field === "burst"    && val < 1)
    || (field === "priority" && val < 1);

  if (isBad) {
    input.classList.add("input-error"); // mark invalid
  } else {
    input.classList.remove("input-error"); // remove highlight
  }
}


// =============================================
// FINAL VALIDATION (BEFORE CALCULATION)
// =============================================

// Ensures all job inputs are valid before running algorithm
function validate() {
  saveTableData();

  for (let i = 0; i < jobs.length; i++) {
    let job = jobs[i];

    if (isNaN(job.arrival) || isNaN(job.burst) || isNaN(job.priority)) {
      showError(job.id + ": All fields must be filled in with numbers.");
      return false;
    }
    if (job.arrival < 0) {
      showError(job.id + ": Arrival time cannot be negative.");
      return false;
    }
    if (job.burst < 1) {
      showError(job.id + ": Burst time must be at least 1.");
      return false;
    }
    if (job.priority < 1) {
      showError(job.id + ": Priority must be at least 1.");
      return false;
    }
  }

  return true; // valid
}


// =============================================
// MAIN CALCULATION CONTROLLER
// =============================================

// Tracks if calculate button was clicked before
let hasCalculated = false;

function calculate(e) {
  const isDropdownTrigger = e && e.type === "change";
  
  // If user changes algorithm before hitting 'Calculate' for the first time,
  // we just hide the error and stop. No silent lock.
  if (isDropdownTrigger && !hasCalculated) {
    hideError();
    return;
  }
  
  // Only proceed if there is actually data to calculate
  if (jobs.length === 0) return; 

  if (!validate()) return;

  hasCalculated = true;

  let algo = document.getElementById("algorithm").value;

  // Select algorithm
  let ganttBlocks;
  if      (algo === "FCFS") ganttBlocks = runFCFS(jobs);
  else if (algo === "NPP")  ganttBlocks = runNPP(jobs);
  else if (algo === "SJF")  ganttBlocks = runSJF(jobs);
  else if (algo === "SRTF") ganttBlocks = runSRTF(jobs);
  else {
    showError(algo + " is not implemented yet.");
    return;
  }

  // Compute results
  let results = calculateResults(jobs, ganttBlocks);

  // Restart animations for result panels
  let panels = document.querySelectorAll(".panel-content");
  panels.forEach(p => {
    p.style.animation = 'none';
    p.offsetHeight; // trigger reflow
    p.style.animation = '';
  });

  // Display outputs
  displayGantt(ganttBlocks);
  displayTAT(results);
  displayWT(results);
  displayTimeline(jobs);
  displayCPU(jobs, ganttBlocks);
}


// =============================================
// SCHEDULING ALGORITHMS
// =============================================

// ---------- FCFS (First Come First Serve) ----------
// Executes jobs in order of arrival time
function runFCFS(jobs) {
  let sorted      = [...jobs].sort((a, b) => a.arrival - b.arrival);
  let ganttBlocks = [];
  let clock       = 0;

  for (let i = 0; i < sorted.length; i++) {
    let job = sorted[i];

    // Insert IDLE if CPU is waiting
    if (clock < job.arrival) {
      ganttBlocks.push({ id: "IDLE", start: clock, end: job.arrival });
      clock = job.arrival;
    }

    ganttBlocks.push({ id: job.id, start: clock, end: clock + job.burst });
    clock = clock + job.burst;
  }

  return ganttBlocks;
}


// ---------- NPP (Non-Preemptive Priority) ----------
// Picks the job with highest priority (lowest number)
function runNPP(jobs) {
  let remaining   = [...jobs];
  let ganttBlocks = [];
  let clock       = 0;
  let done        = 0;

  while (done < jobs.length) {
    let available = remaining.filter(j => j.arrival <= clock);

    // If no job is ready, CPU becomes idle
    if (available.length === 0) {
      let nextArrival = Math.min(...remaining.map(j => j.arrival));
      ganttBlocks.push({ id: "IDLE", start: clock, end: nextArrival });
      clock = nextArrival;
      continue;
    }

    // Find job with highest priority
    let best = available[0];
    for (let i = 1; i < available.length; i++) {
      if (available[i].priority < best.priority) best = available[i];
    }

    ganttBlocks.push({ id: best.id, start: clock, end: clock + best.burst });
    clock = clock + best.burst;
    done++;
    remaining = remaining.filter(j => j.id !== best.id);
  }

  return ganttBlocks;
}


// ---------- SJF (Shortest Job First) ----------
// Picks the job with the shortest burst time.
function runSJF(jobs) {
  let remaining   = [...jobs];
  let ganttBlocks = [];
  let clock       = 0;
  let done        = 0;

  while (done < jobs.length) {
    let available = remaining.filter(j => j.arrival <= clock);

    // If no job has arrived yet, jump to the next one and record IDLE
    if (available.length === 0) {
      let nextArrival = Math.min(...remaining.map(j => j.arrival));
      ganttBlocks.push({ id: "IDLE", start: clock, end: nextArrival });
      clock = nextArrival;
      continue;
    }

    // Pick the job with the shortest burst time
    let best = available[0];
    for (let i = 1; i < available.length; i++) {
      if (available[i].burst < best.burst) best = available[i];
    }

    ganttBlocks.push({ id: best.id, start: clock, end: clock + best.burst });
    clock = clock + best.burst;
    done++;
    remaining = remaining.filter(j => j.id !== best.id);
  }

  return ganttBlocks;
}


// ---------- SRTF (Shortest Remaining Time First) ----------
// Preemptive version of SJF.
// Every clock tick, it picks the job with the LEAST remaining time.
// If a new job arrives with less remaining time than the current one,
// the current job is paused (preempted) and the new one runs instead.
function runSRTF(jobs) {
  // 1. Setup tasks with remaining time and track original burst
  let tasks = jobs.map(j => ({
    id: j.id,
    arrival: j.arrival,
    burst: j.burst,
    remaining: j.burst
  }));

  let ganttBlocks = [];
  let clock = 0;
  let done = 0;

  while (done < tasks.length) {
    // 2. Find jobs that have arrived and aren't finished
    let available = tasks.filter(j => j.arrival <= clock && j.remaining > 0);

    if (available.length === 0) {
      // CPU is IDLE: Find the earliest future arrival
      let futureJobs = tasks.filter(j => j.remaining > 0);
      if (futureJobs.length > 0) {
        let nextArrival = Math.min(...futureJobs.map(j => j.arrival));
        ganttBlocks.push({ id: "IDLE", start: clock, end: nextArrival });
        clock = nextArrival;
      }
      continue;
    }

    // 3. Pick the job with the LEAST remaining time
    // If tie, pick the one that arrived first
    available.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
    let best = available[0];

    // 4. Find the next potential preemption point (next job arrival)
    // Sort all future arrivals to find the absolute next one
    let futureArrivals = tasks.filter(j => j.arrival > clock && j.remaining > 0);
    let nextArrival = futureArrivals.length > 0 
                      ? Math.min(...futureArrivals.map(j => j.arrival)) 
                      : Infinity;

    // 5. CALCULATE THE JUMP
    // We run until the job finishes OR a new job arrives to challenge it
    let runTime = Math.min(best.remaining, nextArrival - clock);

    // 6. Update Gantt Chart
    // If the same job is already running, just extend the existing block
    if (ganttBlocks.length > 0 && ganttBlocks[ganttBlocks.length - 1].id === best.id) {
      ganttBlocks[ganttBlocks.length - 1].end += runTime;
    } else {
      ganttBlocks.push({ id: best.id, start: clock, end: clock + runTime });
    }

    // 7. Advance the clock and state
    best.remaining -= runTime;
    clock += runTime;

    if (best.remaining === 0) {
      done++;
    }
  }

  return ganttBlocks;
}

// =============================================
// RESULT COMPUTATION
// =============================================

// Computes completion time, turnaround time, and waiting time
function calculateResults(jobs, ganttBlocks) {
  let results = [];
  for (let i = 0; i < jobs.length; i++) {
    let job = jobs[i];
    let myBlocks = ganttBlocks.filter(b => b.id === job.id);
    
    // Safety check: if the job never ran, default to 0 to prevent a crash
    if (myBlocks.length === 0) {
      results.push({ id: job.id, completionTime: 0, tat: 0, wt: 0 });
      continue;
    }

    let lastBlock = myBlocks[myBlocks.length - 1];
    let completionTime = lastBlock.end;
    let tat = completionTime - job.arrival;
    let wt = tat - job.burst;

    results.push({ id: job.id, completionTime: completionTime, tat: tat, wt: wt });
  }
  return results;
}


// =============================================
// DISPLAY FUNCTIONS (OUTPUT TO UI)
// =============================================

// ---------- Gantt Chart ----------
function displayGantt(ganttBlocks) {
  let firstTime = ganttBlocks[0].start;
  let totalTime = ganttBlocks[ganttBlocks.length - 1].end;
  let span      = totalTime - firstTime;

  let barsDiv   = document.getElementById("ganttBars");
  let labelsDiv = document.getElementById("burstLabels");
  let timeDiv   = document.getElementById("timeLabels");

  barsDiv.innerHTML = labelsDiv.innerHTML = timeDiv.innerHTML = "";

  for (let i = 0; i < ganttBlocks.length; i++) {
    let block    = ganttBlocks[i];
    let duration = block.end - block.start;
    let pct      = (duration / span) * 100 + "%";
    let isIdle   = block.id === "IDLE";

    let jobIndex = jobs.findIndex(j => j.id === block.id);
    let color    = isIdle ? "#2a2a2a" : getColor(jobIndex);
    let txtColor = isIdle ? "#666"    : "#111";

    // Burst label
    labelsDiv.innerHTML += `
      <div style="width: ${pct}; text-align: center; color: #f7e68a;">
        ${isIdle ? "" : duration}
      </div>`;

    // Bar
    barsDiv.innerHTML += `
      <div class="gantt-bar" style="width: ${pct}; background: ${color}; color: ${txtColor};
        border: ${isIdle ? "2px dashed #444" : "2px solid #111"};
        font-style: ${isIdle ? "italic" : "normal"};">
        ${block.id}
      </div>`;

    // Time labels
    timeDiv.innerHTML += `<div>${block.start}</div>`;
  }

  timeDiv.innerHTML += `<div class="end-time">${totalTime}</div>`;
}


// ---------- Turnaround Time ----------
function displayTAT(results) {
  let total = 0;
  let lines = "";

  for (let i = 0; i < results.length; i++) {
    let r       = results[i];
    let arrival = jobs[i].arrival;
    let color   = getColor(i);
    total      += r.tat;

    lines += `
      <div class="result-line" style="border-left: 4px solid ${color};">
        tt${i+1} = ${r.completionTime} - ${arrival} = <b>${r.tat}</b>
      </div>`;
  }

  let avg = (total / results.length).toFixed(2);

  document.getElementById("tatBox").innerHTML = `
    <div class="result-row">
      <div class="result-lines">${lines}</div>
      <div class="avg-box"><span>Avg TAT</span><b>${avg} ms</b></div>
    </div>`;
}


// ---------- Waiting Time ----------
function displayWT(results) {
  let total = 0;
  let lines = "";

  for (let i = 0; i < results.length; i++) {
    let r     = results[i];
    let burst = jobs[i].burst;
    let color = getColor(i);
    total    += r.wt;

    lines += `
      <div class="result-line" style="border-left: 4px solid ${color};">
        wt${i+1} = ${r.tat} - ${burst} = <b>${r.wt}</b>
      </div>`;
  }

  let avg = (total / results.length).toFixed(2);

  document.getElementById("wtBox").innerHTML = `
    <div class="result-row">
      <div class="result-lines">${lines}</div>
      <div class="avg-box"><span>Avg WT</span><b>${avg} ms</b></div>
    </div>`;
}


// ---------- Timeline ----------
function displayTimeline(jobs) {
  let ids = "", ticks = "", arrivals = "";

  for (let i = 0; i < jobs.length; i++) {
    let color  = getColor(i);
    ids      += `<div class="tl-cell" style="color: ${color};">${jobs[i].id}</div>`;
    ticks    += `<div class="tl-cell" style="color: ${color};">|</div>`;
    arrivals += `<div class="tl-cell">${jobs[i].arrival}</div>`;
  }

  document.getElementById("timelineBox").innerHTML = `
    <div class="timeline-chart">
      <div class="tl-row">${ids}</div>
      <div class="tl-row tl-middle">${ticks}</div>
      <div class="tl-row">${arrivals}</div>
    </div>`;
}


// ---------- CPU Utilization ----------
function displayCPU(jobs, ganttBlocks) {
  // Sum of all burst times
  let totalBurst = 0;
  for (let i = 0; i < jobs.length; i++) {
    totalBurst += jobs[i].burst;
  }

  // Total time span
  let totalSpan = ganttBlocks[ganttBlocks.length - 1].end - ganttBlocks[0].start;

  // Total idle time
  let idleTime = 0;
  for (let i = 0; i < ganttBlocks.length; i++) {
    if (ganttBlocks[i].id === "IDLE") {
      idleTime += ganttBlocks[i].end - ganttBlocks[i].start;
    }
  }

  let burstParts  = jobs.map(j => j.burst).join(" + ");
  let utilization = ((totalBurst / totalSpan) * 100).toFixed(0);

  document.getElementById("cpuBox").innerHTML = `
    <div class="cpu-display">
      <div>${burstParts}</div>
      <div class="cpu-line"></div>
      <div>${totalSpan}</div>
      <br>
      <div>${totalBurst} / ${totalSpan} = ${(totalBurst / totalSpan).toFixed(2)} × 100 =
        <span class="cpu-result">${utilization}%</span>
      </div>
      <br>
      <div class="idle-info">IDLE TIME: <b>${idleTime}</b> units</div>
    </div>`;
}


// =============================================
// RESET APP
// =============================================
function resetApp() {
  // 1. Reset Global State
  nextJobId = 1;
  jobs = [];
  hasCalculated = false;

  // 2. Reset the Algorithm dropdown to default
  const algoDropdown = document.getElementById("algorithm");
  if (algoDropdown) algoDropdown.value = "FCFS";

  // 3. Dynamic UI Reset
  // We target the boxes and reset them to a clean state 
  // without hardcoding long strings inside the JS.
  const panels = ["tatBox", "wtBox", "timelineBox", "cpuBox"];
  panels.forEach(id => {
    const box = document.getElementById(id);
    if (box) {
      box.innerHTML = "Pending calculation..."; 
      box.className = "panel-content gray-text";
    }
  });

  // 4. Clear Gantt Chart layers
  const chartLayers = ["ganttBars", "burstLabels", "timeLabels"];
  chartLayers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  // 5. Finalize UI
  hideError();
  buildTable(); // This will now render an empty table based on the empty jobs array
}


// =============================================
// ERROR HANDLING
// =============================================

// Show error message on screen
function showError(message) {
  let box = document.getElementById("errorMsg");
  box.textContent = "⚠ " + message;
  box.style.display = "block";
}

// Hide error message and remove red highlights
function hideError() {
  document.getElementById("errorMsg").style.display = "none";

  let badInputs = document.querySelectorAll(".input-error");
  for (let i = 0; i < badInputs.length; i++) {
    badInputs[i].classList.remove("input-error");
  }
}

