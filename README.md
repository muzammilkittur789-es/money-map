# FinTrack Family 🚀
### Smart UPI QR Scan & Family Expense Tracker

A modern, frictionless expense management mobile app built with **React Native (Expo)** designed specifically for the Indian UPI ecosystem and collaborative household budgeting.

---

## ✨ Features Built

1. **Instant QR Scan & Pay**:
   - Built-in camera viewfinder that scans any Indian merchant UPI QR code (`upi://pay`).
   - Extracts merchant name (`pn`), UPI VPA (`pa`), and Merchant Category Code (`mc`).
   - Auto-categorizes merchants (e.g. `5411` $\rightarrow$ Groceries, `5812` $\rightarrow$ Dining).
   - Prompts for amount and category **before** redirecting.
   - Deep-links directly to **PhonePe**, **Google Pay**, or **Paytm** with amount and notes pre-filled—eliminating double typing!
   - Built-in **"Test Demo Merchant QR"** button so you can test the full flow even without a physical QR code.

2. **Quick Cash Expense Logging**:
   - 1-tap `+ Cash` button for logging cash spent (Auto/Taxi, Mandi vegetables, street food, small errands).
   - Quick denomination chips (`+₹50`, `+₹100`, `+₹200`, `+₹500`).

3. **Personal-First with Family Pool**:
   - Toggle switch on the dashboard:
     - **👤 My Spends**: Strictly private personal expenses only visible to you.
     - **👨‍👩‍👧‍👦 Family Pool**: Aggregated household ledger showing total home expenses.
   - When logging any expense, a 1-tap pill tags it as `Personal` or `Family`.

4. **Fintech Dashboard & Visual Analytics**:
   - **Time Filters**: Filter instantly by `Today`, `This Month`, `This Year`, or `All Time`.
   - **Outflow Cards**: Total outflow amount with dynamic cash vs online split bar.
   - **Payment Breakdown**: UPI/Online percentage vs Cash percentage.
   - **Monthly Budget Guardrail**: Visual progress bar tracking household spending against your monthly target (e.g. ₹35,000) with warning indicators at $\ge 80\%$.
   - **Category Distribution**: Share-of-wallet ranking with colorful category badges.
   - **Member Breakdown**: Transparent overview of who paid for what in the family.

5. **Family Hub Management**:
   - Unique 6-character Family Invite Code (`FAM786`) with 1-tap copy and WhatsApp share.
   - Add new family members (Spouse, Kids, Parents, Roommates, Domestic Staff) with custom avatars.
   - Update household monthly budget.

---

## 📱 How to Run & Test on Your Real Phone

### Step 1: Install Expo Go
On your Android phone (or iPhone), open the **Google Play Store** (or Apple App Store) and install the free **Expo Go** app.

### Step 2: Start the Project
Open PowerShell on your computer, navigate to this folder, and run:
```powershell
cd C:\Users\Lenovo\.gemini\antigravity\scratch\family-expense-tracker
npm.cmd start
```

### Step 3: Scan the QR Code
A QR code will appear right in your terminal:
- On **Android**: Open the **Expo Go** app and tap **"Scan QR Code"**.
- The app will load onto your phone immediately!
