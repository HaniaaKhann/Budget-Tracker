function toggleIncome() {
  document.getElementById("incomeForm").classList.remove("d-none");
  document.getElementById("expenseForm").classList.add("d-none");
}

function toggleExpense() {
  document.getElementById("expenseForm").classList.remove("d-none");
  document.getElementById("incomeForm").classList.add("d-none");
}

function toggleCustomCategory(type) {
  const select = document.getElementById(type + "Category");
  const custom = document.getElementById(type + "CustomCategory");
  if (!select || !custom) return;

  if (select.value === "__other__") {
    custom.classList.remove("d-none");
    custom.required = true;
  } else {
    custom.classList.add("d-none");
    custom.required = false;
    custom.value = "";
  }
}

function openEditModal(id, amount, category, description) {
  document.getElementById("editModal").style.display = "flex";
  document.getElementById("editAmount").value = amount;
  document.getElementById("editCategory").value = category;
  document.getElementById("editDescription").value = description;
  document.getElementById("editForm").action = "/edit-transaction/" + id;
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

function initCharts() {
  const pieCanvas = document.getElementById("categoryChart");
  if (pieCanvas) {
    const labels = JSON.parse(pieCanvas.dataset.labels || "[]");
    const values = JSON.parse(pieCanvas.dataset.values || "[]");

    if (labels.length > 0) {
      new Chart(pieCanvas, {
        type: "pie",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: [
              "#4f46e5",
              "#16a34a",
              "#dc2626",
              "#f59e0b",
              "#64748b",
              "#0ea5e9",
              "#8b5cf6",
              "#14b8a6",
            ],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 12, padding: 14 },
            },
          },
        },
      });
    }
  }

  const trendCanvas = document.getElementById("trendChart");
  if (trendCanvas) {
    const chartLabels = JSON.parse(trendCanvas.dataset.labels || "[]");
    const incomeData = JSON.parse(trendCanvas.dataset.income || "[]");
    const expenseData = JSON.parse(trendCanvas.dataset.expense || "[]");

    new Chart(trendCanvas, {
      type: "line",
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: "Income",
            data: incomeData,
            borderColor: "#16a34a",
            backgroundColor: "rgba(22, 163, 74, 0.1)",
            fill: true,
            tension: 0.3,
          },
          {
            label: "Expense",
            data: expenseData,
            borderColor: "#dc2626",
            backgroundColor: "rgba(220, 38, 38, 0.08)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, padding: 14 },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleSidebar");
  const sidebar = document.getElementById("sidebar");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
    });
  }

  if (typeof Chart !== "undefined") {
    initCharts();
  }
});
