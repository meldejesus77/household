export default function BudgetPage() {
  return (
    <>
      <style>{`
        .budget-sticky {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 200;
          background: #1a1a1a;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0;
          padding: 0 1.25rem;
          height: 48px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 0.82rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        }
        .sticky-home {
          background: none;
          border: 1px solid rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.75);
          border-radius: 5px;
          padding: 0.3rem 0.75rem;
          font-size: 0.78rem;
          cursor: pointer;
          text-decoration: none;
          margin-right: 1.25rem;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .sticky-home:hover { background: rgba(255,255,255,0.08); }
        .sticky-divider {
          width: 1px;
          height: 28px;
          background: rgba(255,255,255,0.12);
          margin: 0 1.25rem;
        }
        .sticky-stat { display: flex; flex-direction: column; gap: 1px; }
        .sticky-stat .label { font-size: 0.67rem; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.4); }
        .sticky-stat .value { font-size: 0.88rem; font-weight: 600; font-variant-numeric: tabular-nums; }
        .sticky-stat.expenses .value { color: #f28b70; }
        .sticky-stat.income   .value { color: #6ecfa8; }
        .sticky-stat.gap      .value { color: #ffd17a; }
        .sticky-spacer { flex: 1; }
        .budget-wrap * { box-sizing: border-box; margin: 0; padding: 0; }
        .budget-wrap {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f5f5f0;
          color: #222;
          padding: 2rem;
          padding-top: 4rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .budget-wrap h1 { font-size: 1.6rem; margin-bottom: 0.25rem; color: #111; }
        .subtitle { color: #888; font-size: 0.85rem; margin-bottom: 2rem; }
        .notice {
          background: #fff8e1;
          border-left: 3px solid #f0c040;
          padding: 0.6rem 1rem;
          font-size: 0.85rem;
          margin-bottom: 2rem;
          color: #555;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 1.5rem;
        }
        .section {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .section.wide { grid-column: 1 / -1; }
        .section-header {
          padding: 0.65rem 1rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #fff;
        }
        .education     .section-header { background: #4a7c59; }
        .fina          .section-header { background: #5a7aa8; }
        .health        .section-header { background: #c0674f; }
        .grocery       .section-header { background: #5a8fa3; }
        .subscriptions .section-header { background: #7a6ea8; }
        .financial     .section-header { background: #5a6878; }
        .housecar      .section-header { background: #7a8c6e; }
        .shopping      .section-header { background: #c09050; }
        .unique        .section-header { background: #a06080; }
        .income        .section-header { background: #3a7a7a; }
        .summary       .section-header { background: #333; }
        .budget-wrap table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .budget-wrap thead th {
          padding: 0.3rem 1rem;
          text-align: right;
          font-size: 0.7rem;
          font-weight: 600;
          color: #aaa;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-bottom: 1px solid #eee;
          background: #fafafa;
        }
        .budget-wrap thead th.label { text-align: left; }
        .budget-wrap td {
          padding: 0.45rem 1rem;
          border-bottom: 1px solid #f0f0f0;
          vertical-align: top;
        }
        .budget-wrap tr:last-child td { border-bottom: none; }
        .budget-wrap td.label { color: #333; }
        .budget-wrap td.amount {
          text-align: right;
          font-variant-numeric: tabular-nums;
          color: #333;
          white-space: nowrap;
        }
        .budget-wrap td.amount.monthly { color: #888; }
        .budget-wrap td.notes { color: #888; font-size: 0.8rem; }
        .budget-wrap tr.total-row td {
          font-weight: 700;
          background: #fafafa;
          border-top: 2px solid #e0e0e0;
          color: #111;
        }
        .budget-wrap tr.weekly-row td { color: #aaa; font-size: 0.8rem; font-style: italic; }
        .budget-wrap tr.subcat-header td {
          padding: 0.5rem 1rem 0.25rem;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #9a8ec8;
          background: #f7f6fc;
          border-top: 1px solid #e8e4f4;
          border-bottom: none;
        }
        .budget-wrap tr.subcat-header:first-of-type td { border-top: none; }
        .budget-wrap tr.subtotal-row td {
          font-weight: 600;
          color: #555;
          background: #f7f6fc;
          border-top: 1px solid #e8e4f4;
          font-size: 0.82rem;
        }
        .uncertain { color: #c09050; font-size: 0.75rem; margin-left: 4px; }
        .missing { color: #bbb; font-style: italic; }
        .estimate { color: #888; font-style: italic; }
        .budget-wrap tr.income-row td { color: #3a7a7a; }
        .budget-wrap tr.expense-row td { color: #c0674f; }
        .budget-wrap tr.gap-row td { color: #555; }
        .summary table td { padding: 0.55rem 1rem; }
      `}</style>

      <div className="budget-sticky">
        <a href="/" className="sticky-home">← Home</a>
        <div className="sticky-divider" />
        <div className="sticky-stat expenses">
          <span className="label">Total Expenses</span>
          <span className="value">$9,067 / mo</span>
        </div>
        <div className="sticky-divider" />
        <div className="sticky-stat income">
          <span className="label">Total Income</span>
          <span className="value">$10,258 / mo</span>
        </div>
        <div className="sticky-divider" />
        <div className="sticky-stat gap">
          <span className="label">Gap</span>
          <span className="value">$1,191 / mo</span>
        </div>
        <div className="sticky-spacer" />
      </div>

      <div className="budget-wrap">
        <h1>Annual Budget</h1>
        <p className="subtitle">2026 · All amounts annualized</p>

        <div className="notice">
          ⚠ Annual taxes owed may not be fully reflected in the expense total. Some subscription amounts are still unknown.
        </div>

        <div className="grid">

          {/* JO EDUCATION */}
          <div className="section education">
            <div className="section-header">Jo Education</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">College Fund</td><td className="amount monthly">$500.00</td><td className="amount">$6,000.00</td><td className="notes"></td></tr>
                <tr><td className="label">Immaculata</td><td className="amount monthly">$999.00</td><td className="amount">$11,988.00</td><td className="notes"></td></tr>
                <tr><td className="label">Fees</td><td className="amount monthly">$133.33</td><td className="amount">$1,600.00</td><td className="notes"></td></tr>
                <tr><td className="label">Camps</td><td className="amount monthly">$291.67</td><td className="amount">$3,500.00</td><td className="notes">DD Care</td></tr>
                <tr className="total-row"><td className="label">Total</td><td className="amount monthly">$1,924.00</td><td className="amount">$23,088.00</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

          {/* FINA ACTIVITIES */}
          <div className="section fina">
            <div className="section-header">Fina Activities</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Gym</td><td className="amount monthly">$115.00</td><td className="amount">$1,380.00</td><td className="notes"></td></tr>
                <tr><td className="label">Jiu Jitsu</td><td className="amount monthly">$84.00</td><td className="amount">$1,008.00</td><td className="notes"></td></tr>
                <tr><td className="label">Swim</td><td className="amount monthly">$115.00</td><td className="amount">$1,380.00</td><td className="notes"></td></tr>
                <tr><td className="label">Violin</td><td className="amount monthly">$160.00</td><td className="amount">$1,920.00</td><td className="notes"></td></tr>
                <tr><td className="label">Hooked on Phonics</td><td className="amount monthly missing">—</td><td className="amount missing">—</td><td className="notes"><span className="uncertain">amount unknown</span></td></tr>
                <tr className="total-row"><td className="label">Total</td><td className="amount monthly">$474.00</td><td className="amount">$5,688.00</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

          {/* HEALTH */}
          <div className="section health">
            <div className="section-header">Health</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Mel doc/meds</td><td className="amount monthly">$50.00</td><td className="amount">$600.00</td><td className="notes">FSA</td></tr>
                <tr><td className="label">Mel yoga</td><td className="amount monthly">$60.00</td><td className="amount">$720.00</td><td className="notes"></td></tr>
                <tr><td className="label">KP yoga</td><td className="amount monthly">$80.00</td><td className="amount">$960.00</td><td className="notes"></td></tr>
                <tr><td className="label">KP doc/dentist</td><td className="amount monthly">$16.67</td><td className="amount">$200.00</td><td className="notes">FSA</td></tr>
                <tr><td className="label">Jo doc/dentist</td><td className="amount monthly">$8.33</td><td className="amount">$100.00</td><td className="notes">FSA</td></tr>
                <tr><td className="label">Roscoe doc</td><td className="amount monthly">$69.33</td><td className="amount">$832.00</td><td className="notes"></td></tr>
                <tr><td className="label">Fitness</td><td className="amount monthly">$110.00</td><td className="amount">$1,320.00</td><td className="notes">$60 each</td></tr>
                <tr><td className="label">Haircuts</td><td className="amount monthly">$17.50</td><td className="amount">$210.00</td><td className="notes"></td></tr>
                <tr><td className="label">Massage etc.</td><td className="amount monthly">$33.33</td><td className="amount">$400.00</td><td className="notes"></td></tr>
                <tr className="total-row"><td className="label">Total</td><td className="amount monthly">$445.17</td><td className="amount">$5,342.00</td><td className="notes"></td></tr>
                <tr className="weekly-row"><td className="label">Weekly</td><td className="amount monthly">—</td><td className="amount">$102.73</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

          {/* GROCERY */}
          <div className="section grocery">
            <div className="section-header">Grocery</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Target</td><td className="amount monthly">$900.00</td><td className="amount">$10,800.00</td><td className="notes"></td></tr>
                <tr><td className="label">Harris Teeter</td><td className="amount monthly">$350.00</td><td className="amount">$4,200.00</td><td className="notes"></td></tr>
                <tr><td className="label">Whole Foods</td><td className="amount monthly">$150.00</td><td className="amount">$1,800.00</td><td className="notes"></td></tr>
                <tr><td className="label">Co-op</td><td className="amount monthly">$20.00</td><td className="amount">$240.00</td><td className="notes"></td></tr>
                <tr className="total-row"><td className="label">Total</td><td className="amount monthly">$1,420.00</td><td className="amount">$17,040.00</td><td className="notes"></td></tr>
                <tr className="weekly-row"><td className="label">Weekly</td><td className="amount monthly">—</td><td className="amount">$327.69</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

          {/* FINANCIAL */}
          <div className="section financial">
            <div className="section-header">Financial</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Mel/KP IRA</td><td className="amount monthly">$1,166.67</td><td className="amount">$14,000.00</td><td className="notes"></td></tr>
                <tr><td className="label">Mel life insurance</td><td className="amount monthly">$120.00</td><td className="amount">$1,440.00</td><td className="notes"></td></tr>
                <tr><td className="label">Life insurance K</td><td className="amount monthly">$30.00</td><td className="amount">$360.00</td><td className="notes"></td></tr>
                <tr><td className="label">Taxes est.</td><td className="amount monthly">$100.00</td><td className="amount">$1,200.00</td><td className="notes"></td></tr>
                <tr className="total-row"><td className="label">Total</td><td className="amount monthly">$1,416.67</td><td className="amount">$17,000.00</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

          {/* SUBSCRIPTIONS */}
          <div className="section subscriptions wide">
            <div className="section-header">Subscriptions</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr className="subcat-header"><td colSpan={4}>Memberships</td></tr>
                <tr><td className="label">Target</td><td className="amount monthly">$8.25</td><td className="amount">$99.00</td><td className="notes"></td></tr>
                <tr><td className="label">Amazon Prime</td><td className="amount monthly">$12.50</td><td className="amount">$150.00</td><td className="notes"></td></tr>
                <tr><td className="label">Museum LifeSci</td><td className="amount monthly">$15.42</td><td className="amount">$185.00</td><td className="notes"></td></tr>
                <tr><td className="label">Flowers CSA</td><td className="amount monthly">$11.67</td><td className="amount">$140.00</td><td className="notes">Seasonal farm share</td></tr>
                <tr className="subtotal-row"><td className="label">Subtotal</td><td className="amount monthly">$47.83</td><td className="amount">$574.00</td><td className="notes"></td></tr>

                <tr className="subcat-header"><td colSpan={4}>Streaming &amp; Media</td></tr>
                <tr><td className="label">Amazon Music</td><td className="amount monthly">$14.08</td><td className="amount">$169.00</td><td className="notes"></td></tr>
                <tr><td className="label">Audible</td><td className="amount monthly">$15.00</td><td className="amount">$180.00</td><td className="notes">USAA</td></tr>
                <tr><td className="label">Kindle Comics</td><td className="amount monthly">$5.00</td><td className="amount">$60.00</td><td className="notes"><span className="uncertain">amount uncertain</span></td></tr>
                <tr><td className="label">Kindle Unlimited</td><td className="amount monthly">$12.00</td><td className="amount">$144.00</td><td className="notes"></td></tr>
                <tr><td className="label">Streaming Services</td><td className="amount monthly estimate">$45.00</td><td className="amount estimate">$540.00</td><td className="notes"><span className="uncertain">estimate — not yet itemized</span></td></tr>
                <tr className="subtotal-row"><td className="label">Subtotal</td><td className="amount monthly">$91.08</td><td className="amount">$1,093.00</td><td className="notes"></td></tr>

                <tr className="subcat-header"><td colSpan={4}>Apps &amp; Software</td></tr>
                <tr><td className="label">Claude</td><td className="amount monthly">$19.99</td><td className="amount">$239.88</td><td className="notes"></td></tr>
                <tr><td className="label">1Password</td><td className="amount monthly">$6.99</td><td className="amount">$83.88</td><td className="notes"></td></tr>
                <tr><td className="label">Apple Arcade</td><td className="amount monthly">$5.00</td><td className="amount">$60.00</td><td className="notes">Apple</td></tr>
                <tr><td className="label">Strum Machine</td><td className="amount monthly">$5.00</td><td className="amount">$60.00</td><td className="notes"></td></tr>
                <tr><td className="label">Simply Piano etc.</td><td className="amount monthly missing">—</td><td className="amount missing">—</td><td className="notes"><span className="uncertain">amount unknown</span></td></tr>
                <tr><td className="label">Chess</td><td className="amount monthly">$0.00</td><td className="amount">$0.00</td><td className="notes">Apple<span className="uncertain">?</span></td></tr>
                <tr><td className="label">Amazon Photo</td><td className="amount monthly">$1.67</td><td className="amount">$20.00</td><td className="notes"></td></tr>
                <tr className="subtotal-row"><td className="label">Subtotal</td><td className="amount monthly">$38.65</td><td className="amount">$463.76</td><td className="notes"></td></tr>

                <tr className="subcat-header"><td colSpan={4}>Giving</td></tr>
                <tr><td className="label">Immaculate Heart</td><td className="amount monthly">$60.00</td><td className="amount">$720.00</td><td className="notes">Church donation</td></tr>
                <tr className="subtotal-row"><td className="label">Subtotal</td><td className="amount monthly">$60.00</td><td className="amount">$720.00</td><td className="notes"></td></tr>

                <tr className="total-row"><td className="label">Total</td><td className="amount monthly">$237.56</td><td className="amount">$2,850.76</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

          {/* HOUSE & CAR */}
          <div className="section housecar">
            <div className="section-header">House &amp; Car</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">416 Property Tax</td><td className="amount monthly">$375.00</td><td className="amount">$4,500.00</td><td className="notes">Escrow</td></tr>
                <tr><td className="label">416 Insurance</td><td className="amount monthly">$104.42</td><td className="amount">$1,253.00</td><td className="notes">Escrow</td></tr>
                <tr><td className="label">104 Property Tax</td><td className="amount monthly">$177.00</td><td className="amount">$2,124.00</td><td className="notes"></td></tr>
                <tr><td className="label">State Farm Bundle</td><td className="amount monthly">$190.00</td><td className="amount">$2,280.00</td><td className="notes">Mel &amp; KP car + 104 &amp; 416 homeowners</td></tr>
                <tr><td className="label">416 Gas</td><td className="amount monthly">$20.00</td><td className="amount">$240.00</td><td className="notes"></td></tr>
                <tr><td className="label">416 Internet</td><td className="amount monthly">$80.00</td><td className="amount">$960.00</td><td className="notes">AT&amp;T</td></tr>
                <tr><td className="label">416 Electric</td><td className="amount monthly">$200.00</td><td className="amount">$2,400.00</td><td className="notes"></td></tr>
                <tr><td className="label">416 Water</td><td className="amount monthly">$50.00</td><td className="amount">$600.00</td><td className="notes">USAA</td></tr>
                <tr><td className="label">ADT</td><td className="amount monthly">$60.00</td><td className="amount">$720.00</td><td className="notes">USAA</td></tr>
                <tr><td className="label">104 Gutters/Leaves</td><td className="amount monthly">$41.67</td><td className="amount">$500.00</td><td className="notes"></td></tr>
                <tr><td className="label">416 Gutters/Leaves</td><td className="amount monthly">$25.00</td><td className="amount">$300.00</td><td className="notes"></td></tr>
                <tr><td className="label">KP Cellphone</td><td className="amount monthly">$68.00</td><td className="amount">$816.00</td><td className="notes">AT&amp;T</td></tr>
                <tr><td className="label">Car Maintenance</td><td className="amount monthly">$41.67</td><td className="amount">$500.00</td><td className="notes">Oil, wipers, tires, inspections, washes</td></tr>
                <tr><td className="label">Car Registrations</td><td className="amount monthly">$16.67</td><td className="amount">$200.00</td><td className="notes"><span className="uncertain">estimate</span></td></tr>
                <tr><td className="label">Parking</td><td className="amount monthly">$33.33</td><td className="amount">$400.00</td><td className="notes">KP campus, downtown, Duke Gardens</td></tr>
                <tr><td className="label">Ani/Rebecca</td><td className="amount monthly">$392.00</td><td className="amount">$4,704.00</td><td className="notes">10 weeks off per year</td></tr>
                <tr><td className="label">Home Depot</td><td className="amount monthly">$75.00</td><td className="amount">$900.00</td><td className="notes">Up from Amazon reduction</td></tr>
                <tr className="total-row"><td className="label">Total</td><td className="amount monthly">$1,949.75</td><td className="amount">$23,397.00</td><td className="notes"></td></tr>
                <tr className="weekly-row"><td className="label">Weekly</td><td className="amount monthly">—</td><td className="amount">$449.94</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

          {/* SHOPPING */}
          <div className="section shopping">
            <div className="section-header">Shopping</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Art</td><td className="amount monthly">$40.00</td><td className="amount">$480.00</td><td className="notes"></td></tr>
                <tr><td className="label">Entertainment/Eat Out</td><td className="amount monthly">$65.00</td><td className="amount">$780.00</td><td className="notes"></td></tr>
                <tr><td className="label">Books/Videos</td><td className="amount monthly">$35.00</td><td className="amount">$420.00</td><td className="notes"></td></tr>
                <tr><td className="label">Amazon</td><td className="amount monthly">$400.00</td><td className="amount">$4,800.00</td><td className="notes">Reduce — was $700/mo</td></tr>
                <tr><td className="label">Tools</td><td className="amount monthly">$40.00</td><td className="amount">$480.00</td><td className="notes"></td></tr>
                <tr><td className="label">Clothes</td><td className="amount monthly">$30.00</td><td className="amount">$360.00</td><td className="notes">Excl. Immaculata uniforms</td></tr>
                <tr><td className="label">Fina Accessories</td><td className="amount monthly">$20.00</td><td className="amount">$240.00</td><td className="notes"></td></tr>
                <tr><td className="label">ABC</td><td className="amount monthly">$30.00</td><td className="amount">$360.00</td><td className="notes"></td></tr>
                <tr><td className="label">Convenience</td><td className="amount monthly">$40.00</td><td className="amount">$480.00</td><td className="notes">Contribution</td></tr>
                <tr className="total-row"><td className="label">Total</td><td className="amount monthly">$700.00</td><td className="amount">$8,400.00</td><td className="notes"></td></tr>
                <tr className="weekly-row"><td className="label">Weekly</td><td className="amount monthly">—</td><td className="amount">$161.54</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

          {/* UNIQUE EXPENSES */}
          <div className="section unique">
            <div className="section-header">Unique Expenses</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Travel</td><td className="amount monthly">$250.00</td><td className="amount">$3,000.00</td><td className="notes"></td></tr>
                <tr><td className="label">Gifts</td><td className="amount monthly">$250.00</td><td className="amount">$3,000.00</td><td className="notes"></td></tr>
                <tr className="total-row"><td className="label">Total</td><td className="amount monthly">$500.00</td><td className="amount">$6,000.00</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

          {/* INCOME */}
          <div className="section income">
            <div className="section-header">Income</div>
            <table>
              <thead><tr><th className="label"></th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr className="income-row"><td className="label">KP Salary</td><td className="amount monthly">$3,900.00</td><td className="amount">$46,800.00</td><td className="notes"></td></tr>
                <tr className="income-row"><td className="label">Mel Salary</td><td className="amount monthly">$3,758.33</td><td className="amount">$45,100.00</td><td className="notes"></td></tr>
                <tr className="income-row"><td className="label">Edgewood</td><td className="amount monthly">$1,100.00</td><td className="amount">$13,200.00</td><td className="notes"></td></tr>
                <tr className="income-row"><td className="label">Total FSA</td><td className="amount monthly">$400.00</td><td className="amount">$4,800.00</td><td className="notes"></td></tr>
                <tr className="income-row"><td className="label">Cruz</td><td className="amount monthly">$1,100.00</td><td className="amount">$13,200.00</td><td className="notes"></td></tr>
                <tr className="total-row income-row"><td className="label">Total Income</td><td className="amount monthly">$10,258.33</td><td className="amount">$123,100.00</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

          {/* SUMMARY */}
          <div className="section summary wide">
            <div className="section-header">Summary</div>
            <table>
              <thead><tr><th className="label">Category</th><th>Monthly</th><th>Annual</th><th className="label">Notes</th></tr></thead>
              <tbody>
                <tr><td className="label">Jo Education</td><td className="amount monthly">$1,924.00</td><td className="amount">$23,088.00</td><td className="notes"></td></tr>
                <tr><td className="label">Fina Activities</td><td className="amount monthly">$474.00</td><td className="amount">$5,688.00</td><td className="notes"></td></tr>
                <tr><td className="label">Health</td><td className="amount monthly">$445.17</td><td className="amount">$5,342.00</td><td className="notes"></td></tr>
                <tr><td className="label">Grocery</td><td className="amount monthly">$1,420.00</td><td className="amount">$17,040.00</td><td className="notes"></td></tr>
                <tr><td className="label">Financial</td><td className="amount monthly">$1,416.67</td><td className="amount">$17,000.00</td><td className="notes"></td></tr>
                <tr><td className="label">Subscriptions</td><td className="amount monthly">$237.56</td><td className="amount">$2,850.76</td><td className="notes"></td></tr>
                <tr><td className="label">House &amp; Car</td><td className="amount monthly">$1,949.75</td><td className="amount">$23,397.00</td><td className="notes"></td></tr>
                <tr><td className="label">Shopping</td><td className="amount monthly">$700.00</td><td className="amount">$8,400.00</td><td className="notes"></td></tr>
                <tr><td className="label">Unique Expenses</td><td className="amount monthly">$500.00</td><td className="amount">$6,000.00</td><td className="notes"></td></tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  );
}
