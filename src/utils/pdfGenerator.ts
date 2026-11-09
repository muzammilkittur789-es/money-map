import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Expense, ExpenseScope, FamilyGroup, InflowItem } from '../types';

interface GeneratePdfOptions {
  expenses: Expense[];
  inflows: InflowItem[];
  scope: ExpenseScope;
  group: FamilyGroup;
  periodLabel: string;
}

export async function generateAndSharePdfReport({
  expenses,
  inflows,
  scope,
  group,
  periodLabel,
}: GeneratePdfOptions): Promise<boolean> {
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalInflow = inflows.reduce((sum, item) => sum + item.amount, 0);
  const netSaved = totalInflow - totalExpense;
  const savingsRate =
    totalInflow > 0 ? Math.max(0, Math.round((netSaved / totalInflow) * 100)) : 0;

  const onlineExpense = expenses
    .filter((e) => e.paymentMode === 'ONLINE')
    .reduce((sum, item) => sum + item.amount, 0);
  const cashExpense = expenses
    .filter((e) => e.paymentMode === 'CASH')
    .reduce((sum, item) => sum + item.amount, 0);

  // Category Breakdown
  const catTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const sortedCategories = Object.entries(catTotals).sort(([, a], [, b]) => b - a);

  // Member Breakdown
  const memberTotals: Record<string, { name: string; avatar: string; total: number }> = {};
  expenses.forEach((e) => {
    const key = e.spentBy?.name || 'You';
    if (!memberTotals[key]) {
      memberTotals[key] = {
        name: key,
        avatar: e.spentBy?.avatar || '👤',
        total: 0,
      };
    }
    memberTotals[key].total += e.amount;
  });

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Money Map - ${periodLabel} Financial Statement</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 32px;
            background-color: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #059669;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .app-name {
            font-size: 26px;
            font-weight: 800;
            color: #059669;
            letter-spacing: -0.5px;
          }
          .statement-title {
            font-size: 14px;
            color: #475569;
            margin-top: 4px;
            font-weight: 600;
          }
          .meta-info {
            text-align: right;
            font-size: 12px;
            color: #64748b;
          }
          .meta-badge {
            display: inline-block;
            background-color: #ecfdf5;
            color: #065f46;
            padding: 4px 10px;
            border-radius: 12px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .kpi-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
          }
          .kpi-label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .kpi-val {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
          }
          .kpi-val.green { color: #16a34a; }
          .kpi-val.red { color: #dc2626; }
          .section-title {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 24px;
            margin-bottom: 10px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 1px solid #cbd5e1;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #f1f5f9;
            color: #1e293b;
          }
          .amount-col {
            text-align: right;
            font-weight: 700;
          }
          .badge-pill {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
          }
          .badge-cash { background-color: #ecfdf5; color: #059669; }
          .badge-upi { background-color: #eff6ff; color: #2563eb; }
          .footer {
            margin-top: 32px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="app-name">Money Map</div>
            <div class="statement-title">Financial Statement (${periodLabel})</div>
          </div>
          <div class="meta-info">
            <div class="meta-badge">${scope === 'FAMILY' ? group.name : 'Personal View'}</div>
            <div>Generated: ${currentDate}</div>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">Total Inflow</div>
            <div class="kpi-val green">+₹${totalInflow.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Total Expenses</div>
            <div class="kpi-val red">-₹${totalExpense.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Net Surplus Saved</div>
            <div class="kpi-val ${netSaved >= 0 ? 'green' : 'red'}">₹${netSaved.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Savings Rate</div>
            <div class="kpi-val">${savingsRate}%</div>
          </div>
        </div>

        <div style="display: flex; gap: 20px;">
          <!-- Category Summary -->
          <div style="flex: 1;">
            <div class="section-title">Spending by Category</div>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style="text-align: right;">Amount</th>
                  <th style="text-align: right;">% Share</th>
                </tr>
              </thead>
              <tbody>
                ${sortedCategories
                  .map(([cat, amt]) => {
                    const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
                    return `
                      <tr>
                        <td>${cat}</td>
                        <td class="amount-col">₹${amt.toLocaleString('en-IN')}</td>
                        <td style="text-align: right; color: #64748b;">${pct}%</td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>

          <!-- Member Summary -->
          ${
            scope === 'FAMILY'
              ? `
            <div style="flex: 1;">
              <div class="section-title">Household Member Contribution</div>
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th style="text-align: right;">Amount Spent</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.values(memberTotals)
                    .map(
                      (m) => `
                    <tr>
                      <td>${m.avatar} ${m.name}</td>
                      <td class="amount-col">₹${m.total.toLocaleString('en-IN')}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
              : ''
          }
        </div>

        <!-- Full Itemized Transaction List -->
        <div class="section-title">Itemized Transactions (${expenses.length} Records)</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description / Merchant</th>
              <th>Category</th>
              <th>Payment Mode</th>
              <th>Spender</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${expenses
              .map((e) => {
                const dateStr = new Date(e.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                });
                return `
                  <tr>
                    <td style="color: #64748b;">${dateStr}</td>
                    <td style="font-weight: 600;">${e.title}</td>
                    <td>${e.category}</td>
                    <td>
                      <span class="badge-pill ${e.paymentMode === 'CASH' ? 'badge-cash' : 'badge-upi'}">
                        ${e.paymentMode === 'CASH' ? 'Cash' : e.upiProvider || 'UPI'}
                      </span>
                    </td>
                    <td>${e.spentBy?.name || 'You'}</td>
                    <td class="amount-col">-₹${e.amount.toLocaleString('en-IN')}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated automatically by Money Map • Private & Confidential Household Ledger
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Download Money Map ${periodLabel} Statement`,
      });
      return true;
    } else {
      console.warn('Sharing not available on this device');
      return false;
    }
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return false;
  }
}
