async function sendEmailNow() {
  const btn = document.getElementById('sendReportBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const date = document.querySelector('input[type="date"]').value;
    const barstaff = document.querySelector('select').value;
    const items = [];

    document.querySelectorAll('.stock-row').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 0) return;
      const item = cells[0].innerText.trim();
      const opening = parseInt(row.querySelector('.opening')?.value || "0");
      const received = parseInt(row.querySelector('.received')?.value || "0");
      const damaged = parseInt(row.querySelector('.damaged')?.value || "0");
      const closing = parseInt(row.querySelector('.closing')?.value || "0");
      const sold = parseInt(row.querySelector('.sold')?.value || "0");
      const price = cells[6].innerText.trim();

      items.push({ item, opening, received, damaged, closing, sold, price });
    });

    const totalSales = document.getElementById('totalSales').textContent.trim();

    const res = await fetch(' http://127.0.0.1:3000/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, barstaff, items, totalSales })
    });

    const data = await res.json();

    if (data.success) {
      alert('✅ Report sent successfully.');
    } else {
      alert('❌ Error: ' + data.message);
    }

  } catch (err) {
    alert('❌ Could not contact the server. Is it running?');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = '📧 Send Report Now';
  }
}
