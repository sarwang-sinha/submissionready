(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', () => {
        // Remove index.html from URL for cleaner look
        if (window.location.pathname.endsWith('/index.html')) {
            window.history.replaceState({}, document.title, window.location.pathname.replace(/\/index\.html$/, '/'));
        }

        // Configuration
        const PROXY_ENDPOINT = "/.netlify/functions/send-data";
        const STORAGE_KEY = 'amity_student_details';

        // DOM Elements
        const form = document.getElementById('assignmentForm');

        // Toast Notification System
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);

        function showToast(message, type = 'info', title = '') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;

            const icons = { success: '✓', error: '✕', info: 'ℹ' };
            if (!title) title = type.charAt(0).toUpperCase() + type.slice(1);

            const iconDiv = document.createElement('div');
            iconDiv.className = 'toast-icon';
            iconDiv.textContent = icons[type] || icons.info;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'toast-content';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'toast-title';
            titleDiv.textContent = title;

            const messageDiv = document.createElement('div');
            messageDiv.className = 'toast-message';
            messageDiv.textContent = message;

            contentDiv.appendChild(titleDiv);
            contentDiv.appendChild(messageDiv);
            toast.appendChild(iconDiv);
            toast.appendChild(contentDiv);
            toastContainer.appendChild(toast);

            requestAnimationFrame(() => toast.classList.add('show'));

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        // Utility Functions
        const sanitize = (str) => {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        const toTitleCase = (str) => {
            if (!str) return '';
            return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };

        const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        const validateForm = () => {
            if (!navigator.onLine) {
                showToast('No internet connection. Please check your network.', 'error', 'Connection Error');
                return false;
            }
            if (!validateEmail(form.email.value)) {
                showToast('Please enter a valid email address.', 'error', 'Invalid Email');
                form.email.focus();
                return false;
            }
            if (!/^[a-zA-Z0-9,\s&]+$/.test(form.enrollmentNumber.value)) {
                showToast('Enrollment number contains invalid characters.', 'error', 'Invalid Input');
                form.enrollmentNumber.focus();
                return false;
            }
            return true;
        };

        // Auto-capitalize inputs
        ['studentName', 'teacherName'].forEach(id => {
            const el = form[id];
            if (el) el.addEventListener('blur', () => el.value = toTitleCase(el.value));
        });

        let isSubmitting = false;

        // Tab Navigation
        const tabBtns = Array.from(document.querySelectorAll('.tab-btn'));
        const tabContents = Array.from(document.querySelectorAll('.tab-content'));

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                const clicked = e.currentTarget;
                clicked.classList.add('active');

                const tabId = clicked.getAttribute('data-tab');
                const content = document.getElementById(tabId);
                if (content) content.classList.add('active');
            });
        });

        // Dynamic Form Fields Logic
        const updateVisibleFields = () => {
            const docType = form.querySelector('input[name="documentType"]:checked').value;
            const groupTopic = document.getElementById('group-topic');
            const groupBatch = document.getElementById('group-batch');
            const groupSubmission = document.getElementById('group-submission-type');

            const inputTopic = document.getElementById('assignmentTopic');
            const inputBatch = document.getElementById('batch');
            const inputSubmission = document.getElementById('submissionType');

            const labelTopic = document.querySelector('label[for="assignmentTopic"]');
            const labelBatch = document.querySelector('label[for="batch"]');
            const labelSubmission = document.querySelector('label[for="submissionType"]');

            if (docType === 'Front Page') {
                groupTopic.classList.remove('collapsed');
                groupSubmission.classList.remove('collapsed');
                groupBatch.classList.add('collapsed');

                inputTopic.required = true;
                inputSubmission.required = true;
                inputBatch.required = false;

                labelTopic.textContent = 'Assignment Topic';
                labelSubmission.textContent = 'Submission Type';
            } else if (docType === 'Bona Fide') {
                groupTopic.classList.add('collapsed');
                groupSubmission.classList.add('collapsed');
                groupBatch.classList.remove('collapsed');

                inputTopic.required = false;
                inputSubmission.required = false;
                inputBatch.required = true;

                labelBatch.textContent = 'Batch';
            } else {
                // Both
                groupTopic.classList.remove('collapsed');
                groupSubmission.classList.remove('collapsed');
                groupBatch.classList.remove('collapsed');

                inputTopic.required = true;
                inputSubmission.required = true;
                inputBatch.required = true;

                labelTopic.textContent = 'Assignment Topic (for Front Page)';
                labelBatch.textContent = 'Batch (for Bona Fide)';
                labelSubmission.textContent = 'Submission Type (for Front Page)';
            }
        };

        form.querySelectorAll('input[name="documentType"]').forEach(radio => radio.addEventListener('change', updateVisibleFields));
        updateVisibleFields();

        // Semester Logic
        const departmentSelect = document.getElementById('department');
        const semesterInput = document.getElementById('semester');
        const semesterSelectWrapper = document.getElementById('semesterSelectWrapper');
        const semesterSelect = document.getElementById('semesterSelect');

        const departmentSemesterMap = {
            'Amity School of Engineering And Technology': 8,
            'Amity Institute of Pharmacy': 8,
            'Amity Institute of Information and Technology': 6,
            'Amity Institute of Biotechnology': 8
        };

        const toRoman = (num) => {
            const rules = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
            let str = '';
            for (let i of Object.keys(rules)) {
                let q = Math.floor(num / rules[i]);
                num -= q * rules[i];
                str += i.repeat(q);
            }
            return str;
        };

        const updateSemesterOptions = () => {
            const selectedDept = departmentSelect.value;
            const maxSemesters = departmentSemesterMap[selectedDept];

            if (!selectedDept) {
                semesterInput.style.display = 'none';
                semesterInput.required = false;
                semesterSelectWrapper.style.display = 'block';
                semesterSelect.textContent = '';
                semesterSelect.add(new Option('Select Department First', '', true, true));
                semesterSelect.options[0].disabled = true;
                semesterSelect.disabled = true;
                semesterSelect.required = false;
            } else if (maxSemesters) {
                semesterInput.style.display = 'none';
                semesterInput.required = false;
                semesterSelectWrapper.style.display = 'block';
                semesterSelect.disabled = false;
                semesterSelect.required = true;
                semesterSelect.textContent = '';
                semesterSelect.add(new Option('Select Semester', '', true, true));
                semesterSelect.options[0].disabled = true;
                for (let i = 1; i <= maxSemesters; i++) {
                    const roman = toRoman(i);
                    const option = document.createElement('option');
                    option.value = `${roman} Semester`;
                    option.textContent = roman;
                    semesterSelect.appendChild(option);
                }
            } else {
                // Fallback for custom text
                semesterInput.style.display = 'block';
                semesterInput.required = false;
                semesterSelectWrapper.style.display = 'none';
                semesterSelect.disabled = true;
                semesterSelect.required = false;
            }
        };

        departmentSelect.addEventListener('change', updateSemesterOptions);
        updateSemesterOptions();

        // Form Submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (isSubmitting) return;
            if (!validateForm()) return;

            isSubmitting = true;
            const btn = form.querySelector('.btn-primary');
            btn.classList.add('loading');
            btn.innerHTML = '';

            const statusSpan = document.createElement('span');
            statusSpan.className = 'status-msg';
            statusSpan.textContent = 'Generating...';
            btn.appendChild(statusSpan);
            btn.disabled = true;

            // Determine semester value
            let semesterValue = (semesterSelectWrapper.style.display !== 'none') ? semesterSelect.value : semesterInput.value;

            const formattedName = sanitize(toTitleCase(form.studentName.value));
            const formattedTeacher = sanitize(toTitleCase(form.teacherName.value));

            const payload = {
                documentType: sanitize(form.querySelector('input[name="documentType"]:checked').value),
                department: sanitize(form.department.value),
                studentName: formattedName,
                enrollmentNumber: sanitize(form.enrollmentNumber.value),
                assignmentTopic: sanitize(form.assignmentTopic.value),
                __file_type__: sanitize(form.submissionType.value),
                batch: sanitize(form.batch.value),
                subjectName: sanitize(form.subjectName.value),
                semester: sanitize(semesterValue),
                teacherName: formattedTeacher,
                email: sanitize(form.email.value)
            };

            fetch(PROXY_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
                .then(async res => {
                    const txt = await res.text();
                    try {
                        return JSON.parse(txt);
                    } catch (e) {
                        if (res.ok) return { success: true };
                        throw new Error('Service is temporarily unavailable.');
                    }
                })
                .then(response => {
                    btn.classList.remove('loading');

                    if (response.success || response.message === 'Email sent') {
                        const docType = form.querySelector('input[name="documentType"]:checked').value;
                        const successMsg = docType === 'Both' ? 'Documents Sent' : `${docType} Sent`;

                        btn.textContent = '';
                        const checkSpan = document.createElement('span');
                        checkSpan.textContent = `✓ ${successMsg} to Email`;
                        btn.appendChild(checkSpan);
                        btn.style.backgroundColor = '#10B981';
                        btn.style.color = 'white';

                        setTimeout(() => showToast(`Your ${successMsg.toLowerCase()}! Please check your inbox and SPAM folder.`, 'success', 'Success'), 500);
                        saveStudentDetails();
                    } else {
                        btn.textContent = '';
                        const failSpan = document.createElement('span');
                        failSpan.textContent = '⚠ Failed';
                        btn.appendChild(failSpan);
                        btn.style.backgroundColor = '#EF4444';
                        showToast(response.error || 'Unable to generate document. Please try again.', 'error', 'Generation Failed');
                    }

                    setTimeout(() => {
                        btn.textContent = 'Generate Document';
                        btn.style.backgroundColor = '';
                        btn.style.color = '';
                        btn.disabled = false;
                        isSubmitting = false;
                    }, 3000);
                })
                .catch(err => {
                    btn.classList.remove('loading');
                    btn.textContent = '';
                    const errorSpan = document.createElement('span');
                    errorSpan.textContent = '⚠ Network Error';
                    btn.appendChild(errorSpan);
                    btn.style.backgroundColor = '#EF4444';

                    showToast('Service is temporarily unavailable. Please try again in a moment.', 'error', 'Connection Error');

                    setTimeout(() => {
                        btn.textContent = 'Generate Document';
                        btn.style.backgroundColor = '';
                        btn.disabled = false;
                        isSubmitting = false;
                    }, 3000);
                });
        });

        // Local Storage Handling
        const loadStoredDetails = () => {
            const json = localStorage.getItem(STORAGE_KEY);
            if (json) {
                try {
                    const data = JSON.parse(json);
                    if (data.studentName) form.studentName.value = data.studentName;
                    if (data.enrollmentNumber) form.enrollmentNumber.value = data.enrollmentNumber;
                    if (data.email) form.email.value = data.email;
                    if (data.batch) form.batch.value = data.batch;

                    if (data.department) {
                        form.department.value = data.department;
                        updateSemesterOptions();
                        if (data.semester) {
                            if (semesterSelectWrapper.style.display !== 'none') semesterSelect.value = data.semester;
                            else semesterInput.value = data.semester;
                        }
                    }
                } catch (e) { }
            }
        };

        const saveStudentDetails = () => {
            let semesterValue = (semesterSelectWrapper.style.display !== 'none') ? semesterSelect.value : semesterInput.value;
            const details = {
                studentName: form.studentName.value,
                enrollmentNumber: form.enrollmentNumber.value,
                department: form.department.value,
                semester: semesterValue,
                batch: form.batch.value,
                email: form.email.value
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
        };

        // Initialize
        loadStoredDetails();
    });
})();
