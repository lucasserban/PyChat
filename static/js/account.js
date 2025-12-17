document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('profile_pic_input');

    if (fileInput) {
        fileInput.addEventListener('change', function(event) {
            const reader = new FileReader();
            
            reader.onload = function(){
                const output = document.getElementById('avatar-preview');
                const hiddenOutput = document.getElementById('avatar-preview-hidden');
                const placeholder = document.getElementById('avatar-placeholder');

                // If the user already had a profile picture (img tag exists)
                if(output){
                    output.src = reader.result;
                } 
                // If the user had a placeholder letter (need to hide div, show hidden img)
                else if (hiddenOutput && placeholder) {
                    placeholder.style.display = 'none';
                    hiddenOutput.style.display = 'block';
                    hiddenOutput.src = reader.result;
                }
            };

            if(event.target.files[0]) {
                reader.readAsDataURL(event.target.files[0]);
            }
        });
    }
});