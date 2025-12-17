document.addEventListener('DOMContentLoaded', () => {
    // remove top navigation links with these labels on auth pages
    const removeLabels = ['pychat', 'my account', 'direct messages', 'logout', 'global chat'];
    document.querySelectorAll('a').forEach(a => {
      const txt = a.textContent && a.textContent.trim().toLowerCase();
      if (txt && removeLabels.includes(txt)) a.remove();
    });
});