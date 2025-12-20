document.addEventListener('DOMContentLoaded', () => {
    // defines link labels that should be removed from the view
    const removeLabels = ['pychat', 'my account', 'direct messages', 'logout', 'global chat'];
    
    // iterates through all anchor tags and removes them if their text matches the removeLabels list
    document.querySelectorAll('a').forEach(a => {
      const txt = a.textContent && a.textContent.trim().toLowerCase();
      if (txt && removeLabels.includes(txt)) a.remove();
    });

    // selects DOM elements for file input, preview image and placeholder text
    const fileInput = document.getElementById('register-file-input');
    const previewImg = document.getElementById('register-preview');
    const placeholder = document.getElementById('register-placeholder');

    // ensures all elements exist before attaching listeners
    if (fileInput && previewImg && placeholder) {
        fileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];

            if (file) {
                // reads the selected file to display a preview
                const reader = new FileReader();

                reader.onload = function(e) {
                    previewImg.src = e.target.result; 
                    previewImg.style.display = 'block';
                    placeholder.style.display = 'none';
                }

                reader.readAsDataURL(file);
            } else {
                // resets the UI if no file is selected
                previewImg.style.display = 'none';
                previewImg.src = "";
                placeholder.style.display = 'flex';
            }
        });
    }
});
