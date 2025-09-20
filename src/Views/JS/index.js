  const iconBarContainer = document.getElementById('iconBarContainer');
        const header = document.querySelector('header');
        const body = document.querySelector('body');

        function moveBar() {
            header.classList.add('sidebar');
            body.classList.add('sidebar-active');
        }

        function resetBarPosition() {
            header.classList.remove('sidebar');
            body.classList.remove('sidebar-active');
        }