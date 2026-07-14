# Attendance & Pay Tracker

A clean, modern, responsive Progressive Web App (PWA) designed to track attendance, calculate salaries, and manage financial ledgers for workers or domestic help. It features offline resilience, instant calculations, and simple record-keeping.

---

## 🌟 Key Features

* **Daily Attendance Registry**: Simple calendar view to track daily status. Automatically counts days worked, unpaid absences, and allowed paid leaves.
* **Automatic Salary Engine**: Calculates daily rate, gross salary, deductible leaves, and net payable wages dynamically based on month length.
* **Advance & Payout Ledger**: 
  * **Advances**: Track cash advances requested by the worker.
  * **Payouts**: Track partial or full payments of past outstanding balances.
* **Carried-Over Balance Chain**: Chronologically tracks unsettled payments across months, rolling forward any outstanding balances to the current active period automatically.
* **Settlement Banner**: Interactive dashboard alert when past months close, prompting you to log settlements, pay in parts, or carry balances forward.
* **Printable Invoices/Payslips**: Generate detailed calculations and payslips for any month, ready to print or export as a CSV.
* **Device Synchronization**: Live sync across mobile and desktop devices with real-time updates and offline backup support.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** installed on your system.

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the developer server**:
   ```bash
   npm run dev
   ```
   *The app will open automatically in your browser (usually at `http://localhost:3000` or `http://localhost:5173`).*

### Building for Production

Compile and optimize the app (with service workers for PWA installations) into static assets:
```bash
npm run build
```
The build artifacts will be output to the `dist/` directory.

---

## 📱 Installation (PWA)
Since this is a Progressive Web App, you can install it directly to your phone's home screen or desktop:
1. Open the app in your browser.
2. Tap the **Install App** button on the dashboard or use your browser's menu (e.g. "Add to Home Screen" on Safari/Chrome).
3. The app will run in full-screen standalone mode and work offline.

