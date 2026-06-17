function toggleIncome() {
  document.getElementById("incomeForm").classList.remove("d-none");
  document.getElementById("expenseForm").classList.add("d-none");
}

function toggleExpense() {
  document.getElementById("expenseForm").classList.remove("d-none");
  document.getElementById("incomeForm").classList.add("d-none");
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

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleSidebar");
  const sidebar = document.getElementById("sidebar");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
    });
  }
});
