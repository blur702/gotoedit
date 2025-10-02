document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const officeNameInput = document.getElementById('officeName');
    const publicUrl1Input = document.getElementById('publicUrl1');
    const publicUrl2Input = document.getElementById('publicUrl2');
    const editUrlInput = document.getElementById('editUrl');
    const urlsTableBody = document.querySelector('#urls-table tbody');
    const editIndexInput = document.getElementById('editIndex');

    // Load and display saved URLs
    const loadUrls = () => {
        chrome.storage.local.get({ urls: [] }, (result) => {
            const urls = result.urls;
            urlsTableBody.innerHTML = '';
            urls.forEach((url, index) => {
                const row = `<tr>
                    <td>${url.officeName}</td>
                    <td>${url.publicUrl1}</td>
                    <td>${url.publicUrl2 || ''}</td>
                    <td>${url.editUrl}</td>
                    <td>
                        <button class="edit-btn" data-index="${index}">Edit</button>
                        <button class="delete-btn" data-index="${index}">Delete</button>
                    </td>
                </tr>`;
                urlsTableBody.innerHTML += row;
            });
        });
    };

    // Save or update a URL mapping
    saveBtn.addEventListener('click', () => {
        const officeName = officeNameInput.value.trim();
        const publicUrl1 = publicUrl1Input.value.trim();
        const publicUrl2 = publicUrl2Input.value.trim();
        const editUrl = editUrlInput.value.trim();
        const editIndex = editIndexInput.value;

        if (!officeName || !publicUrl1 || !editUrl) {
            alert('Please fill in all required fields (Office Name, Public URL 1, and Edit URL).');
            return;
        }

        chrome.storage.local.get({ urls: [] }, (result) => {
            const urls = result.urls;
            const newUrl = { officeName, publicUrl1, publicUrl2, editUrl };

            if (editIndex !== '') {
                urls[parseInt(editIndex, 10)] = newUrl;
            } else {
                urls.push(newUrl);
            }

            chrome.storage.local.set({ urls }, () => {
                loadUrls();
                // Clear input fields and reset edit index
                officeNameInput.value = '';
                publicUrl1Input.value = '';
                publicUrl2Input.value = '';
                editUrlInput.value = '';
                editIndexInput.value = '';
            });
        });
    });

    // Handle edit and delete button clicks
    urlsTableBody.addEventListener('click', (event) => {
        const target = event.target;
        const index = parseInt(target.getAttribute('data-index'), 10);

        if (target.classList.contains('edit-btn')) {
            chrome.storage.local.get({ urls: [] }, (result) => {
                const urls = result.urls;
                const urlToEdit = urls[index];
                officeNameInput.value = urlToEdit.officeName;
                publicUrl1Input.value = urlToEdit.publicUrl1;
                publicUrl2Input.value = urlToEdit.publicUrl2 || '';
                editUrlInput.value = urlToEdit.editUrl;
                editIndexInput.value = index;
            });
        } else if (target.classList.contains('delete-btn')) {
            chrome.storage.local.get({ urls: [] }, (result) => {
                const urls = result.urls;
                urls.splice(index, 1);
                chrome.storage.local.set({ urls }, loadUrls);
            });
        }
    });

    // Initial load of URLs
    loadUrls();
});