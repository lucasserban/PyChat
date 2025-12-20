document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('profile_pic_input');

    if (fileInput) {
        // listens for file selection
        fileInput.addEventListener('change', function(event) {
            const reader = new FileReader();
            
            // when the file is read, updates the image source
            reader.onload = function() {
                const output = document.getElementById('avatar-preview');
                const hiddenOutput = document.getElementById('avatar-preview-hidden');
                const placeholder = document.getElementById('avatar-placeholder');

                if (output) {
                    output.src = reader.result;
                } else if (hiddenOutput && placeholder) {
                    placeholder.style.display = 'none';
                    hiddenOutput.style.display = 'block';
                    hiddenOutput.src = reader.result;
                }
            };

            // reads the file as a Data URL
            if(event.target.files[0]) {
                reader.readAsDataURL(event.target.files[0]);
            }
        });
    }
});
