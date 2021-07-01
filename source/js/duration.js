!(function () {
    function update() {
        let inter = new Date() - new Date("2021-06-21 21:56:25");
        let sec = Math.floor(inter / 1000)
        let min = Math.floor(sec / 60)
        let hor = Math.floor(min / 60)
        let day = Math.floor(hor / 24)
        sec %= 60
        min %= 60
        hor %= 24
        document.getElementById("runningTime").innerHTML = [
            "本站已运行",
            day,
            "天",
            hor.toString().padStart(2, '0'),
            "小时",
            min.toString().padStart(2, '0'),
            "分",
            sec.toString().padStart(2, '0'),
            "秒",
        ].join(' ');
    }
    update()
    setInterval(update, 1000);
})();
