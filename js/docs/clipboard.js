(function () {
    function showToast(message) {
        const toast = document.createElement("div");
        toast.textContent = message;

        Object.assign(toast.style, {
            position: "fixed",
            right: "18px",
            bottom: "18px",
            background: "rgba(15,23,36,0.95)",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            zIndex: 9999
        });

        document.body.appendChild(toast);
        setTimeout(() => (toast.style.opacity = "0"), 1400);
        setTimeout(() => toast.remove(), 1800);
    }

    window.copyText = function (text) {
        navigator.clipboard
            .writeText(text)
            .then(() => showToast("Copied to clipboard"))
            .catch(() => showToast("Copy failed"));
    };

    window.copySupportEmail = function () {
        window.copyText("sachinhebri927@gmail.com");
    };
})();
