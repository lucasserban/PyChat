document.addEventListener('DOMContentLoaded', () => {
    // 1. Remove navigation links (codul vechi)
    const removeLabels = ['pychat', 'my account', 'direct messages', 'logout', 'global chat'];
    document.querySelectorAll('a').forEach(a => {
      const txt = a.textContent && a.textContent.trim().toLowerCase();
      if (txt && removeLabels.includes(txt)) a.remove();
    });

    // 2. Logică pentru previzualizare imagine la Register (NOU)
    const fileInput = document.getElementById('register-file-input');
    const previewImg = document.getElementById('register-preview');
    const placeholder = document.getElementById('register-placeholder');

    if (fileInput && previewImg && placeholder) {
        fileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];

            if (file) {
                const reader = new FileReader();

                reader.onload = function(e) {
                    // Când fișierul e citit, actualizăm sursa imaginii
                    previewImg.src = e.target.result;
                    
                    // Afișăm imaginea, ascundem placeholder-ul
                    previewImg.style.display = 'block';
                    placeholder.style.display = 'none';
                }

                // Citim imaginea ca URL (base64)
                reader.readAsDataURL(file);
            } else {
                // Dacă utilizatorul dă cancel la selecție
                previewImg.style.display = 'none';
                previewImg.src = "";
                placeholder.style.display = 'flex';
            }
        });
    }
});