// Globs
var player, depo, settings, page = "home", subpage, game, ws, bctout, bcs = [], sysmsg = [], bet=0, udahBet=false;
        isPlaying = false, isWaiting = false, currentRoom = 0, lastResponse = "", mainhref = "", divider=1;

function handleResponse(response, type) {
    var code = response.slice(0, 7);
    var text = response.slice(3, response.length);
    console.log(text);
    code = code.slice(3, 7).split(":")[0];

    switch (code) {
        case "wg":
            if (game && game.cards.length > 0) {
                isPlaying = false;
                player.credit = parseInt(player.credit) + parseInt(game.creditin);
                game = null;
                $("body").removeAttr("data-current-room data-skip data-full data-play-room data-play-rf data-play-fivek data-play-sf data-play-fourk data-play-creditin data-play-creditout data-play-betsize data-play-betx");
                swal("Waktu Gantung Terlampaui", "Permainan Ditutup, Harap Pilih Meja Kembali Untuk Bermain.").then(function () {
                    if ($(".play-content").length)
                        $("#table").click();
                });
            }
            break;

        case "mbx":
        case "ryu":
        case "ryo":
            response = response.split(code + ":")[1].split(";");
            if (response[0].trim()) {
                if (code == "mbx")
                    swal("Perhatian", response[0]);
                else if (code == "ryu") {
                    swal("FREE PLAY BERHADIAH SELESAI",
                            "Anda mendapatkan BONUS CREDIT sebesar " + response[2] + "c\n" +
                            "Harap lakukan deposit (pertama) untuk verifikasi dan klaim BONUS CREDIT Anda.\n").then(function () {
                        window.location.reload();
                    });
                } else if (code == "ryo") {
                    swal("DEPOSIT PERTAMA", "GAME AKAN RELOAD.").then(function () {
                        window.location.reload();
                    });
                }
            }
            break;
            
        case "r":
            response = response.split(code + ":")[1].split(";");
            var info = "\nSaldo sekarang = " + number_format(response[1]) + "c";
            swal("Perhatian", response[0] + info);
            
            player.credit = parseInt(response[1]);
            if (game)
                game.creditout = player.credit;
         
            if ($(".home-profile").length) {
                var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(",");
                $(".player-info #credit").animateNumber({number: player.credit, numberStep: comma_separator_number_step}, 1000);
            } else if ($(".play-content").length)
                $(".play-footer #credit").animateNumber({number: player.credit}, 1000);
            
            break;
            
        case "m": // msg roomout
            break;
        case "lc":
            response = response.split("lc:")[1].split(";");
            if ($(".info-chat-input").length && response[0] == "0")
                $(".info-chat-input input").unbind();
            settings.chat = response[0];
            localStorage.settings = JSON.stringify(settings);
            break;
        case "u":
            response = response.split("u:")[1].split(";");
            if (!response[1])
                swal("Informasi", response[0]);
            else if (response[1] == "1")
                swal("Perhatian", response[0]);
            else if (response[1] == "2") {
                var msg = response[1].slice(0, 1) + response[1].slice(0 - (response[1].length - 1));
                msg = msg.toUpperCase();
                swal("Perhatian", msg);
            }
            break;
        case "y": // heartbeat
            var data = "y:";
            sendData(data);
            break;
        case "mtr": // transfer
            response = response.split("mtr:")[1].split(";");
            var msg = response[0];
            var credit = response[1];
            var totcredit = response[2];
            var title = response[3];

            if (title != "TRANSFER")
                player.credit = parseInt(player.credit) + parseInt(credit);
            else {
                player.credit = parseInt(player.credit) - parseInt(credit);
                $("#trf-username,#trf-credit,#trf-pass").val("");
            }

            if (game)
                game.creditout = player.credit;

            localStorage.player = JSON.stringify(player);

            if ($(".home-profile").length) {
                var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(",");
                $(".home-profile #credit").animateNumber({number: player.credit, numberStep: comma_separator_number_step}, 1000);
            } else if ($(".play-content").length)
                $(".play-footer #credit").animateNumber({number: player.credit}, 1000);

            msg = msg.replace(/@addc/g, number_format(credit)).replace(/@totc/g, number_format(totcredit));
            swal(title, msg);
            break;
        case "e": // last bet | result
            if (lastResponse == text)
                break;
            lastResponse = text;

            response = response.split("e:")[1].split(";");

            var win = response[0].split("|")[0];
            var cardidx = response[1].split("|");
            cardidx[0] = cardidx[0];
            cardidx[1] = cardidx[1];
            var creditwon = parseInt(response[2]);
            var rf = parseInt(response[3]);
            var fivek = parseInt(response[4]);
            var sf = parseInt(response[5]);
            var fourk = parseInt(response[6]);
            var creditin = parseInt(response[7]) / divider;
            var creditout = parseInt(response[8]);
            var gotcolok = response[9];
            
            var nojok = response[11];
            var special = response[12];
            var threecards = response[13].split("|");

            game.rf = rf;
            game.fivek = fivek;
            game.sf = sf;
            game.fourk = fourk;
            if (game.bet3 && !$("body").attr("data-skip"))
                game.bet4 = game.bet3;
            game.fcreditin = creditin;
            game.creditin = creditin;
            game.creditout = creditout;
            game.special = special;
            game.gotcolok = gotcolok;
            game.creditwon = parseInt(creditwon);
            game.nojok = nojok;
            
            var topbonus =  0;
            if(parseInt(game.betsize) >= 50 && game.bet4 && parseInt(win) <= 4)
                topbonus = (parseInt(win) == 4) ? 1000 : 2000;
            game.topbonus = parseInt(topbonus);

            if (game.betx.indexOf("X") > -1) {
                var multiply = game.betx.split("X")[1];
                game.creditwon *= multiply;
                divider = multiply;
                console.log("div="+divider);
            }

            if (threecards.length == 3) {
                game.cards[1] = threecards[0];
                threecards[0] = getCard(threecards[0]);
                game.cards[3] = threecards[1];
                threecards[1] = getCard(threecards[1]);
                game.cards[6] = threecards[2];
                threecards[2] = getCard(threecards[2]);
                flipCard(threecards, cardidx, win);
            } else { // skip
                var cut = Math.abs(1 - game.moves);
                var arr = [1, 3, 4, 5, 6];
                if (game.moves < 3) {
                    for (var i = 0; i < cut; i++)
                        arr.pop();
                }

                for (var i = 0; i < arr.length; i++) {
                    game.cards[arr[i]] = threecards[i];
                    threecards[i] = getCard(threecards[i]);
                }

                flipCard(threecards, cardidx, win, 0, 1);
            }
            updateGameData();
            break;
        case "rdp": // depo data
            var dpdata = response.split("rdp:")[1].split(";");
            depo = {
                bank: dpdata[0],
                name: dpdata[1],
                accnum: dpdata[2],
                rf: parseInt(dpdata[3]),
                fivek: parseInt(dpdata[4]),
                sf: parseInt(dpdata[5]),
                fourk: parseInt(dpdata[6]),
                fh: parseInt(dpdata[7]),
                flush: parseInt(dpdata[8]),
                str: parseInt(dpdata[9]),
                threek: parseInt(dpdata[10]),
                twopair: parseInt(dpdata[11]),
                acepair: parseInt(dpdata[12])
            };
            break;
        case "s": // system msg
            response = response.split("s:");
            response.shift();
            response = response.join("s:").split(";");

            var msg, sender;
            if (response[0].indexOf("@") > -1 && response[0].indexOf(">") > -1) {
                msg = response[0].split("> ");
                sender = "operator";
                msg = msg[1].trim();
            } else {
                msg = response[0];
                sender = "";
            }

            msg = msg.replace(/(?:\r\n|\r|\n)/g, '<br/>');
            sysmsg.push({
                sender: sender,
                msg: msg,
                role: 1
            });

            if ($(".info-chat-messages").length)
                redrawChat(false);
            break;
        case "gui": // login
            var pdata = response.split("gui:")[1].split(";");
            checkLogin(pdata, type);
            break;
        case "pi": // player info
            response = response.split("pi:")[1].split(";");
            player.level = response[1];
            player.exp = response[2];
            player.title = getTitle(parseInt(response[0]));
            localStorage.player = JSON.stringify(player);
            break;
        case "i":
            var logdata = response.split("i:")[1].split(";");
            var statLogin = parseInt(logdata[0]);
            
            if (statLogin < 2 || statLogin > 5) {
                    
                swal("Perhatian", data[data.length - 1]);

                localStorage.removeItem("player");
                localStorage.removeItem("credential");
                ws.close();
                window.location.href = (mainhref.indexOf("?y") > -1) ? "/?y" : "/";
                return false;
            }

            type = "i";

            $("body").attr({"data-log": JSON.stringify(logdata), "data-type": type});
            break;
        case "j":
            var logdata = response.split("j:")[1].split("gui:")[0].split(";");
            type = "j";
            $("body").attr({"data-log": JSON.stringify(logdata), "data-type": type});
            divider=parseInt(logdata[13])>50?parseInt(logdata[13])/50 : 1;
            console.log("div="+divider);
            break;
        case "k":
            var logdata = response.split("k:")[1].split("gui:")[0].split(";");
            type = "k";
            $("body").attr({"data-log": JSON.stringify(logdata), "data-type": type});
            checkLogin(logdata, type);
            break;
        case "pg":
            var logdata = response.split("pg:")[1].split("gui:")[0].split(";");
            type = "pg";
            $("body").attr({"data-log": JSON.stringify(logdata), "data-type": type});
            divider=parseInt(logdata[13])>50?parseInt(logdata[13])/50 : 1;
            console.log("pgdiv="+divider);
            
            break;
        case "o": // transaction
            var tdata = response.split(";;");
            
            if($("body").attr("data-wd")){
                $("body").removeAttr("data-wd");
                tdata = tdata[0].split(";");
                var rek = tdata[1];
                
                $("body").append(
                    '<div class="sub-menu-overlay fadeIn">' +
                    '<div class="sub-menu" onclick="event.stopPropagation();">' +
                    '<div class="sub-menu-close"><i class="fa fa-times"></i></div>' +
                    '<h2><i class="fa fa-times-circle"></i> Tarik Deposit (Cancel)</h2>' +
                    '<table width="100%">' +
                    '<tr>' +
                    '<td colspan="3" class="light-green-color">Rekening Cancel</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>Nomor</td>' +
                    '<td>:</td>' +
                    '<td>' + rek + '</td>' +
                    '</tr>' +
                    '</table>' +
                    '<table width="100%">' +
                    '<tr>' +
                    '<td colspan="2" class="light-green-color">Saldo</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td width="50%">' +
                    '<div id="cancel-usercr">0</div>' +
                    '<div class="label">CR</div>' +
                    '</td>' +
                    '<td width="50%">' +
                    '<div class="label">IDR</div><div id="cancel-useridr">0</div>' +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '<table width="100%">' +
                    '<tr>' +
                    '<td class="light-green-color">Jumlah Cancel</td>' +
                    '<td class="light-green-color">Password</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td width="50%">' +
                    '<div><input id="cancel-amount" type="number" placeholder=" jumlah cancel" max-length="9"></div>' +
                    '<div class="label">CR</div>' +
                    '</td>' +
                    '<td width="50%">' +
                    '<input style="width:100%;" id="cancel-pass" type="password" placeholder=" password" max-length="200">' +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td colspan="2" align="right">' +
                    '<input id="cancel-sbm" type="button" value="Kirim" />' +
                    '</div>' +
                    '</tr>' +
                    '</table>' +
                    '</div>' +
                    '</div>'
                    );

                var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(",");
                $("#cancel-usercr").animateNumber({number: player.credit, numberStep: comma_separator_number_step});
                $("#cancel-useridr").animateNumber({number: Math.floor(player.credit * 100), numberStep: comma_separator_number_step});
    
                $("#cancel-amount").keyup(function (e) {
                    if (e.which == 13)
                        $("#cancel-pass").focus();
                });
    
                $("#cancel-pass").keyup(function (e) {
                    if (e.which == 13)
                        $("#cancel-sbm").click();
                });
    
                $("#cancel-sbm").click(function () {
                    soundPlay("click");
                    var amount = parseInt($("#cancel-amount").val().trim());
                    var pass = $("#cancel-pass").val().trim();
    
                    if (!amount || !pass) {
                        swal("Perhatian", "Harap Isi Semua Data Yang Dibutuhkan Terlebih Dahulu!");
                        return false;
                    }
    
                    if (amount >= 100 && amount % 1 == 0) {
                        swal({
                            title: "Konfirmasi",
                            text: "Jumlah Yang Akan Di-Cancel: " + number_format(amount) + " Credit (" + number_format(amount * 100) + " IDR), Lanjutkan?",
                            buttons: ["Tidak", "Ya"]
                        }).then(function (confirm) {
                            if (confirm) {
                                var data = "p:" + amount.toString() + ";" + pass;
                                sendData(data);
                            }
                        });
    
                    } else
                        swal("Perhatian", "Jumlah Cancel Harus Kelipatan 100 Credit!");
                });
                
                $(".sub-menu-overlay,.sub-menu-close").click(function () {
                    $.when($(".sub-menu-overlay").fadeOut(150)).then(function () {
                        $(".sub-menu-overlay").remove();
                    });
                });
            } else{ // table transaction
                tdata = tdata[1].split("#");
                $("#trans-table tr:last-child").remove();
                if (tdata[0]) {
                    var content = "";
                    for (var i = 0; i < tdata.length; i++) {
                        if (tdata[i]) {
                            var dt = tdata[i].split("|");
                            var ttime = new Date(dt[0]);
                            var tday = (ttime.getDate() < 10) ? "0" + ttime.getDate() : ttime.getDate();
                            var tmonth = ((ttime.getMonth() + 1) < 10) ? "0" + (ttime.getMonth() + 1) : ttime.getMonth();
                            var tyear = ttime.getFullYear().toString();
                            tyear = tyear.slice(2);
                            var thour = (ttime.getHours() < 10) ? "0" + ttime.getHours() : ttime.getHours();
                            var tmin = (ttime.getMinutes() < 10) ? "0" + ttime.getMinutes() : ttime.getMinutes();
                            var ttime = tday + "-" + tmonth + "-" + tyear + " " + thour + ":" + tmin;
                            var tshorthand = dt[1];
                            var tamount = (dt[3] == "0") ? '<span class="light-red-color">' + dt[4].replace(/\-/g, '') + '</span>' : '<span class="light-green-color">' + dt[3].replace(/\+/g, '') + '</span>';
                            if (tamount.indexOf(">0<") > -1)
                                tamount = "<span style='color:#999;'>0</span>";
                            var desc = getTransactCode(tshorthand);
                            if (tshorthand == "TR FR" || tshorthand == "TR TO")
                                desc.trans += ": " + dt[2];
    
                            desc = "<span style='color:" + desc.color + ";'>" + desc.trans + "</span>";
                            content +=
                                    '<tr>' +
                                    '<td width="25%">' + ttime + '</td>' +
                                    '<td width="50%">' + desc + '</td>' +
                                    '<td width="25%" align="right">' + tamount + '</td>' +
                                    '</tr>';
                        }
                    }
                    $("#trans-table").append(content);
                } else
                    $("#trans-table").append('<tr><td colspan="3" align="center">Tidak Ada Data.</td></tr>');
            }
            break;
        case "a": // table
            response = response.split("a:")[1].split(".");

            $("#tab-body").height("auto");
            if (response[0])
                drawTable(response);
            break;
        case "l": // change password
            response = response.split("l:")[1];
            if (response == "0")
                swal("Perhatian", "Password Lama Salah!");
            else {
                swal("Sukses", "Password Telah Diubah!")
                var pass = $("#chpass-new").val().trim();
                var credential = atob(localStorage.credential);
                var header = credential.slice(0, 3);
                var key = convertBase(header[2], 79, 10);

                credential = credential.slice(3, credential.length);
                credential = encDec("D", credential, key);
                credential = credential.split(";");
                credential[1] = pass;
                credential = credential.join(";");
                credential = encDec("E", credential, key);

                var len = credential.length + 3;
                len = convertBase(len.toString(), 10, 79);
                key = convertBase(key, 10, 79);

                credential = "0" + len + key + credential;
                credential = btoa(credential);

                localStorage.credential = credential;
                $(".pass-content input").val("");
            }
            break;
        case "udt": // acc data
            response = response.split("udt:")[1];
            if (response == "1") {
                swal("Sukses", "Data Berhasil Diubah!");
                player.email = $("#acc-email").val().trim();
                player.phone = $("#acc-phone").val().trim();
                localStorage.player = JSON.stringify(player);
            } else
                swal("Perhatian", "Update Gagal, Harap Coba Lagi.");
            break;
        case "q": // menu transfer
            response = response.split("q:")[1].split(";");
            var status = response[0];
            var message = response[2];

            if (status == "1") {
                swal("Sukses", message);
                player.credit = parseInt(player.credit) - parseInt($("#trf-credit").val().trim());
                localStorage.player = JSON.stringify(player);

                if ($(".home-profile").length) {
                    var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(",");
                    $(".home-profile #credit").animateNumber({number: player.credit, numberStep: comma_separator_number_step}, 1000);
                } else if ($(".play-content").length)
                    $(".play-footer #credit").animateNumber({number: player.credit}, 1000);

                $("#trf-username,#trf-credit,#trf-pass").val("");
            } else
                swal("Perhatian", message);
            break;
        case "d": // 1-3 deal
            if (lastResponse == text)
                break;
            lastResponse = text;

            response = response.split("d:")[1];

            var bonus = response.slice(0, 9);
            var rf = convertBase(bonus.slice(0, 3), 79, 10);
            var fivek = convertBase(bonus.slice(3, 5), 79, 10);
            var sf = convertBase(bonus.slice(5, 7), 79, 10);
            var fourk = convertBase(bonus.slice(7, 9), 79, 10);

            game.rf = rf;
            game.fivek = fivek;
            game.sf = sf;
            game.fourk = fourk;

            var betpos = response.charCodeAt(response.length-1);
            game["bet" + betpos] = parseInt($(".info-left .section:nth-child(" + (parseInt(betpos) + 4) + ") .bet-amount").text().trim());

            if (betpos == "1") {
                var card = response.slice(9, -1).split("|");
                game.cards[0] = card[0];
                card[0] = getCard(card[0]);
                game.cards[2] = card[1];
                card[1] = getCard(card[1]);
            } else {
                var card = response.slice(9, -1);
                game.cards[parseInt(betpos) + 2] = card;
                card = getCard(card);
            }

            var isFull = $("body").attr("data-full");
            if (isFull == "1")
                flipCard(card, 0, 0, 1);
            else
                flipCard(card);

            updateGameData();
            break;
        case "b": // open table
            response = response.split("b:")[1].split(";");
            
            if(response[0][0] == "1")
                startGame();
            else {
                if (response[0] == "0") {
                    $("#table").click();
                    swal("Perhatian", "Meja Sudah Ditempati, Silahkan Pilih Yang Lain!");
                } else {
                    $("#table").click();
                    swal("Perhatian", response[1]);
                }
    
                if (game) {
                    $("body").attr({
                        "data-play-room": currentRoom,
                        "data-play-rf": game.rf,
                        "data-play-fivek": game.fivek,
                        "data-play-sf": game.sf,
                        "data-play-fourk": game.fourk,
                        "data-play-creditin": game.creditin,
                        "data-play-creditout": game.creditout,
                        "data-play-betsize": game.betsize,
                        "data-play-betx": game.betx
                    });
                    isPlaying = true;
                }
            }
            break;
        case "h": // creditin
            response = response.split("h:")[1].split(";");
            if(divider)
                game.creditin = parseInt(response[0])/divider;
            else
                game.creditin = response[0];
                
            console.log("==>" + game.creditin);
            
            game.creditout = response[1];
            $("#credit .val").text(game.creditin);
            $(".play-footer #credit").text(game.creditout);
            player.credit = game.creditout;
            localStorage.player = JSON.stringify(player);
            break;
        case "w": // creditout
            response = response.split("w:")[1].split(";");
            game.creditout = response[0];
            game.creditin = response[1];

            if (response[1] == "0")
                $("#credit .val").text("INSERT COIN").addClass("blink");
            else
                $("#credit .val").text(game.creditin);

            $(".play-footer #credit").animateNumber({number: game.creditout},5);
            player.credit = game.creditout;
            localStorage.player = JSON.stringify(player);
            break;
        case "kdp": // deposit
            response = response.split("kdp:")[1].split(";");
            var status = response[0];
            var message = response[1];
            if (status == "1") {
                swal("Sukses", message);
                $("#depo-amount").val("");
                $("#depo-cr").html("&nbsp;");
            } else
                swal("Perhatian", message);
            break;
        case "p": // cancel
            response = response.split("p:")[1].split(";");
            var status = response[0];
            var credit = response[1];

            if (status == "1") {
                swal("Sukses", "Cancel Credit Berhasil, Sisa Credit: " + credit + ".");
                player.credit = parseInt(player.credit) - parseInt($("#cancel-amount").val().trim());
                localStorage.player = JSON.stringify(player);

                var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(",");
                $(".credit,#cancel-usercr").text("").animateNumber({number: player.credit, numberStep: comma_separator_number_step});
                $("#cancel-useridr").text("").animateNumber({number: (player.credit * 100), numberStep: comma_separator_number_step});
                $("#cancel-amount,#cancel-pass").val("");
            }
            else if (credit == "" && response[2])
                swal("Perhatian", response[2]);
            else
                swal("Perhatian", "Password Salah, Harap Coba Lagi!");
            break;
        case "kotx":
            response = response.split("kotx:")[1].split(";");
            var status = response[0];

            if (status == "1") {
                var title = response[1];
                var amount = response[2];
                var terms = response[3];
                var condition = response[4];
                var code = $("#tasiacode").val().trim();
                $("#tasiacode").val("");

                $(".home-code-desc").prepend(
                        '<div class="home-code-confirm">' +
                        '<h3 class="blue-color">' + title + '</h3>' +
                        '<div>' +
                        '<span id="home-code-amount"></span> <i class="fa fa-database"></i>' +
                        '</div>' +
                        '<div><span class="gold-color">Syarat:</span><br/>' + terms + '</div>' +
                        '<div><span class="gold-color">Ketentuan:</span><br/>' + condition + '</div>' +
                        '<div><input id="home-code-accept" type="button" value="Lanjut"> <input id="home-code-cancel" type="button" value="Batal"></div>' +
                        '</div>'
                        );

                if (parseInt(amount) > 0) {
                    var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(",");
                    $("#home-code-amount").animateNumber({number: parseInt(amount), numberStep: comma_separator_number_step});
                } else
                    $("#home-code-amount").parent().hide();

                $("#home-code-accept").click(function () {
                    soundPlay("click");
                    var data = "kota:" + code;
                    sendData(data);
                });

                $("#home-code-cancel").click(function () {
                    soundPlay("click");
                    $.when($(".home-code-confirm").fadeOut(150)).then(function () {
                        $(".home-code-confirm").remove();
                    });
                });
            } else
                swal("Perhatian", response[1]);
            break;
        case "kota":
            response = response.split("kota:")[1].split(";");
            var status = response[0];
            var message = response[1];
            var credit = response[2];

            if (status == "1") {
                swal("Sukses", message);

                player.credit = parseInt(credit);

                if (game)
                    game.creditout = player.credit;

                localStorage.player = JSON.stringify(player);

                if ($(".home-profile").length) {
                    var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(",");
                    $(".home-profile #credit").animateNumber({number: player.credit, numberStep: comma_separator_number_step}, 1000);
                } else if ($(".play-content").length)
                    $(".play-footer #credit").animateNumber({number: player.credit}, 1000);

                $("#home-code-cancel").click();
            } else
                swal("Perhatian", message);
            break;
        case "c":
            response = response.split("c:")[1].split(";");
            var items = [];
            for (var i = 0; i < response.length; i++) {
                if (response[i].trim()) {
                    response[i] = response[i].split("#");
                    var time = response[i][0];
                    var special = response[i][1];
                    var username = response[i][2];
                    var totalbet = response[i][3];
                    var totalwon = response[i][4];
                    var cards = response[i][5].split("|");
                    for (var j = 0; j < cards.length; j++)
                        cards[j] = getCard(cards[j]);

                    items.push({
                        time: time,
                        special: special,
                        username: username,
                        totalbet: totalbet,
                        totalwon: totalwon,
                        cards: cards
                    });
                }
            }

            printGameDetails(items);
            break;
        case "t": // broadcast
            response = response.split("t:")[1].split("|");
            var text = response[0].toUpperCase();
            var id = 0;
    
            if (text.indexOf(" 4K MURNI ")>0)
                id = 11;
            else if (text.indexOf(" STR FLUSH MURNI ")>0)
                id = 21;
            else if (text.indexOf(" 5K MURNI ")>0)
                id = 31;
            else if (text.indexOf(" ROYAL FLUSH MURNI ")>0)
                id = 41;
            else if (text.indexOf(" 4K ")>0)
                id = 10;
            else if (text.indexOf(" STR FLUSH ")>0)
                id = 20;
            else if (text.indexOf(" 5K ")>0)
                id = 30;
            else if (text.indexOf(" ROYAL FLUSH ")>0)
                id = 40;
                
            id = "libfile" + id;

            bcs.push({
                text: text,
                id: id
            });

            if (!bctout)
                doBroadcast();
            break;
    }
}

window.onerror = function(error, url, line) {
    swal("Perhatian", "Terjadi Kesalahan, Halaman Akan Dimuat Ulang.").then(function () {
        location.reload();
    });
};

$("document").ready(function () {
    mainhref = window.location.href;
    if (mainhref.indexOf("?") > -1) {
        if (mainhref.split("?")[1] != "y")
            window.location.href = mainhref.split("?")[0];
    }

    setInterval(function () {
        if ($(".play-content").length && game) {
            var category = game.betsize + "c";
            gtag("event", "playing", {
                event_category: "Website",
                event_label: category
            });
        }
    }, 300000);

    $("body").contextmenu(function (e) {
        e.preventDefault();
    });

    $(".menu-mob").click(function () {
        if (!$(".menu-content").hasClass("active")) {
            $(".menu-content").fadeIn(100);
            setTimeout(function () {
                $(".menu-content").addClass("active");
            }, 100);
        } else {
            $(".menu-content").removeClass("active");
            if($(window).width() < 825){
                setTimeout(function () {
                    $(".menu-content").hide();
                }, 250);
            } else
                $(".menu-content").fadeOut(100);
        }
    });

    $(".overlay-text").html('<span class="blink"><i class="fa fa-hourglass-o"></i> Memuat Game...</span>');
    setTimeout(function () {
        if (isMobile() && $(window).width() < 824) {
            askFullScreen();
            $("html").bind("webkitfullscreenchange mozfullscreenchange fullscreenchange", exitHandler);
        }
    }, 100);

    if (localStorage) {
        if (!localStorage.settings) {
            settings = {
                music: "on",
                speed: 300,
                card: "1",
                chat: "1",
                predict: "1"
            };
            soundPlay("background");
            localStorage.settings = JSON.stringify(settings);
        } else {
            settings = JSON.parse(localStorage.settings);
            if (settings.music == "on")
                soundPlay("background");

            if (!settings.card) {
                settings.card = "1";
                localStorage.settings = JSON.stringify(settings);
            }

            if (!settings.chat) {
                settings.chat = "1";
                localStorage.settings = JSON.stringify(settings);
            }

            if (settings.card != "1")
                $("head").append("<link class='nodef-card' rel='stylesheet' href='/assets/game/css/card" + settings.card + ".css?v=5'/>");
        }

        if (localStorage.credential) {
            var type = "i";
            var credential = atob(localStorage.credential);
            player = JSON.parse(localStorage.player);
            player.credit = 3000000;
            depo = {}; //JSON.parse(localStorage.depo);

            ws = new WebSocket("wss://tangkasnet.9naga.net:8443", ["binary", "base64"]);
            ws.onopen = function () {
                ws.send(credential);
            }
            ws.onmessage = function (evt) {
                var data = evt.data;
                var reader = new FileReader();

                reader.addEventListener('loadend', function (e) {
                    var response = e.srcElement.result;
                    response = response.replace(/\\/g, "\\");
                    response = response.replace(/\//g, "\/");

                    var fixLen = response.length;
                    var responseLen = fixLen;
                    var len, text, header, bytelen, key;

                    while (responseLen > 0) {
                        header = response.slice(0, 3);
                        bytelen = header[0] + header[1];
                        key = parseInt(convertBase(header[2], 79, 10));

                        len = parseInt(convertBase(bytelen, 79, 10));
                        text = response.slice(3, len);

                        text = header + encDec("D", text, key);
                        handleResponse(text, type);

                        response = response.slice(len, fixLen);
                        responseLen -= len;
                    }
                });

                reader.readAsText(data);
            };
            ws.onclose = function () {
                if (localStorage.credential) {
                    swal({
                        title: "Koneksi Terputus",
                        text: "Apakah kamu mau mencoba kembali terhubung?",
                        buttons: ["Tidak, Keluar Saja", "Ya"]
                    }).then(function (confirm) {
                        if (confirm)
                            window.location.href = (mainhref.indexOf("?y") > -1) ? "/main?y" : "/main";
                        else {
                            localStorage.removeItem("player");
                            localStorage.removeItem("credential");
                            window.location.href = (mainhref.indexOf("?y") > -1) ? "/?y" : "/";
                        }
                    });
                }
            };
        } else
            window.location.href = (mainhref.indexOf("?y") > -1) ? "/?y" : "/";
    } else {
        swal({
            title: "Perhatian",
            text: "Your Browser Doesn't Meet The Requirements of The Game, Please Update To The Latest Modern Browser!"
        });
    }
});

function doBroadcast() {
    var bc = bcs.pop();
    var text = bc.text;
    var id = bc.id;

    $(".broadcast").remove();
    $(".header-notice").prepend(
            '<div class="broadcast fadeIn">' +
            '<span class="rainbow">' + text.toUpperCase() + '</span>' +
            '</div>'
            );

    //$("#backgroundAudio")[0].pause();
    
    console.log("/assets/game/sound/" + id + ".mp3");
    
    if (!$("#audio" + id).length) {
        $("<audio/>", {
            id: "audio" + id,
            src: "/assets/game/sound/" + id + ".mp3"
        }).appendTo("body");
        soundPlay("barang", id);
    } else
        soundPlay("barang", id);

    bctout = setTimeout(function () {
        $("#audio" + id)[0].pause();
        $("#audio" + id)[0].currentTime = 0;

        if (settings.music == "on")
            soundPlay("background");

        $.when($(".broadcast").fadeOut(100)).then(function () {
            $(".broadcast").remove();
        });

        if (bcs.length > 0)
            doBroadcast();
        else
            bctout = null;
    }, 22000);
}

var last_send = "", last_index = 0;
function sendData(data) {
    console.log("Send : " + data);
    
    if(data.substr(0,2)=="d:" || data.substr(0,2)=="n:") {
          udahBet=true;
          //debugger;
    }
        
    if (data.substr(0, 2) == "e:" || data.substr(0, 2) == "n:" || data.substr(0, 2) == "d:")
    {
        if (data.substr(0, 2) != "n:") {
            var index = parseInt(data.substr(2));
            if (index > 4 || (index > 1 && index < last_index)) {
                $(".play-buttons .button-overlay").hide();
                isWaiting = false;
                return false;
            }
        }

        if (data.substr(0, 2) == "d:" && last_send.substr(0, 2) == "e:") {
            $(".play-buttons .button-overlay").hide();
            isWaiting = false;
            return false;
        }

        last_index = index;
        last_send = data;
    }

    var key = Math.floor(Math.random() * 78) + 1;
    data = encDec("E", data, key);

    var dataLen = data.length + 3;
    var base = convertBase(dataLen.toString(), 10, 79);
    key = convertBase(key.toString(), 10, 79);

    if (base.length == 1)
        data = "0" + base + key + data;
    else
        data = base + key + data;
    ws.send(data);
}

function drawTable(response) {
    var content = "";
    var counter = 0;
    var tabs = [];
    var tab = {};

    for (var i = 0; i < response.length; i++) {
        if (counter > 4)
            counter = 1;

        switch (counter) {
            case 0:
                tab.room = response[i];
                break;
            case 1:
                tab.color = response[i];
                break;
            case 2:
                tab.username = response[i];
                break;
            case 3:
                tab.bonus = response[i];
                break;
            case 4:
                var splitter = parseInt(tab.room) + 1;
                splitter = splitter.toString();
                response[i] = response[i].split(splitter);

                tab.specials = response[i][0];
                tabs.push(tab);

                tab = {};
                if (response[i].length == 2)
                    tab.room = splitter;
                break;
        }

        counter++;
    }

    if (tabs.length > 0) {
        $("#table-num-f").text(tabs[0].room);
        $("#table-num-l").text(tabs[tabs.length - 1].room);
        for (var i = 0; i < tabs.length; i++) {
            var color = (tabs[i].color == "0") ? "#36399e" : "#e68a00";
            var bonus = tabs[i].bonus.split("");
            var rf = convertBase(bonus[0] + bonus[1] + bonus[2], 79, 10);
            var fivek = convertBase(bonus[3] + bonus[4], 79, 10);
            var strf = convertBase(bonus[5] + bonus[6], 79, 10);
            var fourk = convertBase(bonus[7] + bonus[8], 79, 10);
            var specials = specialTranslate(tabs[i].specials);
            var active = (tabs[i].username == player.username) ? "class='active'" : "";

            content +=
                    '<tr ' + active + '>' +
                    '<td width="8%" align="center">' + tabs[i].room + '</td>' +
                    '<td width="20%" style="color:' + color + ';font-weight:bold;"><div>' + tabs[i].username + '</div></td>' +
                    '<td width="10%" align="right">' + rf + '</td>' +
                    '<td width="9%" align="right">' + fivek + '</td>' +
                    '<td width="8%" align="right">' + strf + '</td>' +
                    '<td width="8%" align="right">' + fourk + '</td>' +
                    '<td width="37%"><div style="height:1.3em;overflow:auto">' + specials + '</div></td>' +
                    '</tr>';

            $("#tab-body").html(content);
            tableFunctions();
        }
    }
}

function checkLogin(pdata, type) {
    var logdata = JSON.parse($("body").attr("data-log"));
    var sectype = ($("body").attr("data-type")) ? $("body").attr("data-type") : type;

    $("body").removeAttr("data-log data-type");

    $.when($(".overlay").fadeOut(150)).then(function () {
        $(".overlay").remove();
        mainFunctions();
        
        if(logdata[0] == "1"){
            swal("Perhatian", logdata[3]).then(function(){
                localStorage.removeItem("player");
                localStorage.removeItem("credential");
                ws.close();
                window.location.href = (mainhref.indexOf("?y") > -1) ? "/?y" : "/";
            });
        } else if (logdata[0] == "2" && sectype == "i") {
            console.log(logdata);
            if(logdata[0] == "2"){ 
                player.credit = logdata[2]/divider;
                player.info = logdata[3];
            }
            menuClick("home");
            if(!game)
                swal("Informasi", player.info.trim());
        } else if (logdata[0] == "4" && sectype == "i")
        {
            
            game = {
                cards: [],
                bet1: 0,
                bet2: 0,
                bet3: 0,
                bet4: 0,
                colok: 1,
                creditin: parseInt(logdata[1]),
                creditout: parseInt(logdata[2]),
                message: logdata[3],
                room: logdata[4],
                betsize: logdata[5],
                rf: parseInt(logdata[6]),
                fivek: parseInt(logdata[7]),
                sf: parseInt(logdata[8]),
                fourk: parseInt(logdata[9]),
                moves: 4
            };

            game.betx = Math.floor(parseInt(logdata[5]) / 50);
            divider = game.betx;
            game.betx = (game.betx == 0) ? logdata[5] + "c" : "X" + game.betx;
            game.betx = (game.betx == "X1") ? "50c" : game.betx;

            game.creditin = game.creditin / divider;
            player.credit = game.creditout;
            player.info = logdata[3];
            localStorage.player = JSON.stringify(player);
            
            console.log("div4="+divider);
            homeMenuClick("play");
        }
        else
        {
            game = {
                room: logdata[0],
                cards: logdata[1].split("|"),
                bet1: parseInt(logdata[2]) / divider,
                bet2: parseInt(logdata[3]) / divider,
                bet3: parseInt(logdata[4]) / divider,
                bet4: parseInt(logdata[5]) / divider,
                colok: logdata[6],
                creditin: parseInt(logdata[7]) / divider,
                creditout: parseInt(logdata[8]),
                rf: parseInt(logdata[9]),
                fivek: parseInt(logdata[10]),
                sf: parseInt(logdata[11]),
                fourk: parseInt(logdata[12]),
                betsize: parseInt(logdata[13]),
                message: logdata[logdata.length - 1].slice(0, -3),
                moves: 4,
                nojok: 0
            };

            //game.betsize = game.betsize > 50 ? game.betsize/50 : 1;
            divider =game.betsize > 50 ? game.betsize/50 : 1;
            console.log("div="+divider);
            
            game.betx = Math.floor(parseInt(logdata[13]) / 50);
            game.betx = (game.betx <= 1) ? logdata[13] + "c" : "X" + game.betx;

            player.info = logdata[logdata.length - 2];
            player.credit = game.creditout;
            localStorage.player = JSON.stringify(player);

            if (game.bet1 != "0")
                game.moves--;
            if (game.bet2 != "0")
                game.moves--;
            if (game.bet3 != "0")
                game.moves--;
            if (game.bet4 != "0")
                game.moves--;

            if (sectype == "pg") { // done section
                var win = logdata[14].split("|");
                var special = win[1];
                win = parseInt(win);

                var cardidx = logdata[15].split("|");
                game.win = win;
                game.special = special;
                game.cardidx = cardidx;
                game.creditwon = parseInt(logdata[16]);
                game.gotcolok = logdata[17];
                
                if(parseInt(game.betsize) >= 50){
                    game.topbonus =  0;
                    if(game.bet4 != "0" && parseInt(win) <= 4)
                        game.topbonus = (parseInt(win) == 4) ? 1000 : 2000;
                
                    if (win && win <= 4) {
                        if (win == 4)
                            game.fourk = parseInt(logdata[20]);
                        if (win == 3)
                            game.sf = parseInt(logdata[20]);
                        if (win == 2)
                            game.fivek = parseInt(logdata[20]);
                        if (win == 1)
                            game.rf = parseInt(logdata[20]);
                    }
                } else{
                    game.topbonus = 0;
                    if (win && win <= 40) {
                        if (win == 4)
                            game.fourk = parseInt(logdata[18]);
                        if (win == 3)
                            game.sf = parseInt(logdata[18]);
                        if (win == 2)
                            game.fivek = parseInt(logdata[18]);
                        if (win == 1)
                            game.rf = parseInt(logdata[18]);
                    }
                }
                game.nojok = logdata[19];
                game.fcreditin = parseInt(logdata[7]) / divider;
                game.creditin = parseInt(logdata[21]) / divider;
            }
            else if (sectype == "k") { // betting section
                game.prize = parseInt(logdata[14]);
                var win = logdata[15].split("|");
                game.win = win[0];
                game.special = win[1];
                game.fcreditin = game.creditin + game.prize;
                game.betting = 1;
            }
            
            setTimeout(function(){
                homeMenuClick("play");
            },200);
        }
        
        if (game && game.room) {
            isPlaying = true;
            $("body").attr({
                "data-play-room": game.room,
                "data-current-room": game.room
            });
        }
    });
}

function mainFunctions() {
    $("#home").click(function () {
        soundPlay("click");
        menuClick("home");
    });
    $("#logout").click(function () {
        soundPlay("click");
        menuClick("logout");
    });
}

function printGameDetails(items) {
    var content = "";
    $("body").append('<div class="game-details-overlay fadeIn"><div class="game-details" onclick="event.stopPropagation();"></div></div>');
    for (var i = 0; i < items.length; i++) {
        var cards = "";
        for (var j = 0; j < items[i].cards.length; j++)
            cards += '<div class="card ' + items[i].cards[j] + '"></div>';

        items[i].time = new Date(items[i].time);
        items[i].time = items[i].time.toString().split(" ");
        items[i].time = items[i].time.splice(1, 4).join(" ");

        var post = "";

        if (items[i].special[0] == "m")
            post = " MURNI";
        if (items[i].special[0] == "y")
            post = " MINYAK";
        if (items[i].special[0] == "s")
            post = " SEMPURNA";

        if (items[i].special.toLowerCase().indexOf("4k") > -1)
            items[i].special = "4 OF A KIND";
        else if (items[i].special.toLowerCase().indexOf("rf") > -1)
            items[i].special = "ROYAL FLUSH";
        else if (items[i].special.toLowerCase().indexOf("sf") > -1)
            items[i].special = "STR FLUSH";
        else if (items[i].special.toLowerCase().indexOf("5k") > -1)
            items[i].special = "5 OF A KIND";

        items[i].special += post;

        var barang = (items.length > 1) ? '<div class="total light-green-color">Barang ' + (i + 1) + ' / ' + items.length + '</div>' : "";
        var leftright = "";
        if (items.length > 1) {
            leftright =
                    '<div class="right"><i class="fa fa-chevron-circle-right fa-lg"></i></div>' +
                    '<div class="left"><i class="fa fa-chevron-circle-left fa-lg"></i></div>';
        }

        content =
                '<div class="game-detail" data-index="' + (i + 1) + '">' +
                '<div class="game-detail-header">' +
                '<i class="fa fa-table"></i> MEJA ' + $("body").attr("data-play-room") +
                barang +
                '</div>' +
                '<div class="game-detail-body">' +
                '<div class="game-detail-username">' + items[i].username.toUpperCase() + '</div>' +
                '<div class="game-detail-cards">' + cards + '</div>' +
                '<div class="game-detail-controls">' +
                leftright +
                '<div class="center gold-color">' + items[i].special + ' ' + items[i].totalbet + ' Credit</div>' +
                '<div style="clear:both;"></div>' +
                '</div>' +
                '</div>' +
                '<div class="game-detail-footer">' +
                '<div class="time">TANGGAL &nbsp; <span>' + items[i].time + '</span></div>' +
                '<div class="won"><span class="light-green-color">MENANG</span> &nbsp; <span class="gold-color">' + items[i].totalwon + '</span> Credit</div>' +
                '</div>' +
                '</div>' + content;
    }
    $(".game-details").html(content);

    if (items.length > 1) {
        $(".game-detail-controls .left").click(function () {
            var el = $(this).parent().parent().parent();
            var index = parseInt(el.attr("data-index"));
            var len = $(".game-detail").length;

            if (index == 1)
                index = len;
            else
                index--;

            $.when($(el).fadeOut(50)).then(function () {
                $(".game-detail[data-index='" + index + "']").fadeIn(50);
            });
        });

        $(".game-detail-controls .right").click(function () {
            var el = $(this).parent().parent().parent();
            var index = parseInt(el.attr("data-index"));
            var len = $(".game-detail").length;

            if (index == len)
                index = 1;
            else
                index++;

            $.when($(el).fadeOut(100)).then(function () {
                $(".game-detail[data-index='" + index + "']").fadeIn();
            });
        });
    }

    $(".game-details-overlay").click(function () {
        $.when($(this).fadeOut(150)).then(function () {
            $(this).remove();
        });
    });
}

function tableFunctions() {
    $("#tab-body tr").click(function () {
        soundPlay("click");
        $("#tab-body tr").removeClass("active");

        $(this).addClass("active");

        var room = $(this).find("td:first-child").text().trim();
        var roomplayer = $(this).find("td:nth-child(2) div").text().trim();

        var betx = $(".bet.active").text().trim();
        betx = (betx.indexOf("X") == -1) ? betx + "c" : betx;
        var betsize = (betx.indexOf("X") == -1) ? $(".bet.active").text().trim() : 50 * parseInt(betx.substr(1));
        console.log("betxx="+betsize);
        //betsize = divider;
        
        $("body").attr({
            "data-play-room": room,
            "data-play-rf": $(this).find("td:nth-child(3)").text().trim(),
            "data-play-fivek": $(this).find("td:nth-child(4)").text().trim(),
            "data-play-sf": $(this).find("td:nth-child(5)").text().trim(),
            "data-play-fourk": $(this).find("td:nth-child(6)").text().trim(),
            "data-play-creditin": "0",
            "data-play-creditout": player.credit,
            "data-play-betsize": betsize,
            "data-play-betx": betx
        });

        $("#room-num").text(room);
        if (!roomplayer && (!game || game.cards.length == 0) || roomplayer==player.username) {
            $("#room-btn").addClass("active");
            $("#table-note").fadeOut(100);
        } else {
            $("#room-btn").removeClass("active");
            if (!game || game.cards.length == 0)
                $("#table-note").text("DITEMPATI " + roomplayer).fadeIn(100);
            else
                $("#table-note").text("GAME BELUM SELESAI").fadeIn(100);
        }
    });

    $("#tab-body tr").dblclick(function () {
        var roomplayer = $(this).find("td:nth-child(2) div").text().trim();
        if(roomplayer==player.username)
            homeMenuClick("play");
        else
            $("#room-btn").click();
    });

    $("#tab-body tr").contextmenu(tableContextMenu);
}

function tableContextMenu(e) {
    e.preventDefault();
    var room = $(this).find("td:first-child").text().trim();
    var data = "c:" + room;
    sendData(data);

    $("body").attr("data-play-room", room);
}

function menuClick(id) {
    switch (id) {
        case "home":
            $(".content").load("/assets/game/page/home/?_=" + new Date().getTime(), function () {
                $(".left-menu").click(function () {
                    soundPlay("click");

                    var page = $(this).attr("data-page");

                    if (subpage != page) {
                        subpage = page;
                        $(".left-menu").removeClass("active");
                        $(this).addClass("active");
                        homeMenuClick(page);
                    }
                });
                
                homeMenuClick("info");
                subpage = "info";
            });
            break;
        case "logout":
            ws.close();
            localStorage.removeItem("depo");
            localStorage.removeItem("player");
            localStorage.removeItem("credential");
            window.location.href = (mainhref.indexOf("?y") > -1) ? "/?y" : "/";
            break;
    }

    inputClick();
}

function homeMenuClick(page) {
    switch (page) {
        case "info":
            $(".right-1").load("/assets/game/page/home/" + page + ".html", function () {
                redrawChat(true);
                
                $(".player-info .username").text(player.username);
                $(".credit").text(player.credit);
                
                if (settings.chat == "1") {
                    $("#info-chat").keyup(function (e) {
                        soundPlay("click");
                        if (e.which == 13) {
                            var msg = $("#info-chat").val().trim();
                            sendChat(player.username, msg);
        
                            var data = "s:" + player.username + ";operator;" + msg;
                            sendData(data);
        
                            sysmsg.push({
                                sender: player.username,
                                msg: msg,
                                role: 0
                            });
                        }
                    });
        
                    $("#info-chat-sbm").click(function () {
                        soundPlay("click");
                        var msg = $("#info-chat").val().trim();
                        sendChat(player.username, msg);
        
                        var data = "s:" + player.username + ";operator;" + msg;
                        sendData(data);
        
                        sysmsg.push({
                            sender: player.username,
                            msg: msg,
                            role: 0
                        });
                    });
                }
        
                $("#tasiacode-sbm").click(function () {
                    soundPlay("click");
                });
            });
            break;
        case "table":
            $(".content").load("/assets/game/page/table/?_=" + new Date().getTime(), function () {
                $(".bet").click(function () {
                    soundPlay("click");
                    $(".bet").removeClass("active");
                    $(this).addClass("active");

                    bet = $(this).text().trim();
                    var tablebet = bet;
                    
                    if(bet.indexOf("X") > -1)
                        bet = parseInt(bet.replace("X","")) * 50;
                    else
                        tablebet += "c";
                        
                    divider= (bet>=50 ? (bet/50) : 1);
                    console.log("ddiv="+divider);
                    var data = "a:" + bet;
                    sendData(data);
                    $("#tab-body").height("100%").html('<tr id="load-table"><td colspan="7" align="center" style="height:100%;">Mengambil Data..</td></tr>');
                    $("#table-bet").text(tablebet);
                });

                if (game && game.betx) {
                    $(".bet").removeClass("active");
                    $(".bet").each(function () {
                        var bet = $(this).text().trim();
                        if (bet == game.betx.replace("c",""))
                            $(this).addClass("active");
                    });
                }

                $(".bet.active").click();

                $("#room-btn").click(function () {
                    soundPlay("click");
                    var bet = $("#table-bet").text().replace("c","");
                    if(bet.indexOf("X") > -1)
                        bet = parseInt(bet.replace("X","")) * 50;
                        
                    if (player.credit < (bet * 4))
                        swal("Perhatian", "Credit Tidak Mencukupi, Harap Deposit Terlebih Dahulu!");
                    else {
                        if ($(this).hasClass("active")) {
                            isPlaying = false;
                            homeMenuClick("play");
                        } else {
                            if (!$("#table-note").is(":visible"))
                                swal("Perhatian", "Pilih Meja Terlebih Dahulu!");
                            else
                                swal("Perhatian", $("#table-note").text().trim());
                        }
                    }
                });
            });
            break;
        case "play":
            $(".content").load("/assets/game/page/play/?_=" + new Date().getTime());
            break;
        case "deposit":
            $("body").append(
                    '<div class="sub-menu-overlay fadeIn">' +
                    '<div class="sub-menu" onclick="event.stopPropagation();">' +
                    '<div class="sub-menu-close"><i class="fa fa-times"></i></div>' +
                    '<h2><i class="fa fa-money"></i> Deposit</h2>' +
                    '<table width="100%">' +
                    '<tr>' +
                    '<td colspan="3" class="light-green-color">Rekening Deposit</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>Nomor</td>' +
                    '<td>:</td>' +
                    '<td>' + depo.accnum + ' (' + depo.bank + ')</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>Atas Nama</td>' +
                    '<td>:</td>' +
                    '<td>' + depo.name + '</td>' +
                    '</tr>' +
                    '</table>' +
                    '<table width="100%">' +
                    '<tr>' +
                    '<td colspan="2" class="light-green-color">Jumlah Deposit</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td width="50%">' +
                    '<div><input id="depo-amount" type="number" placeholder=" jumlah deposit" max-length="9"></div>' +
                    '<div class="label">IDR</div>' +
                    '</td>' +
                    '<td width="50%">' +
                    '<div class="label" style="top:0;">CR</div><div id="depo-cr" style="top:0;">0</div>' +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td colspan="2" align="right">' +
                    '<input id="depo-sbm" type="button" value="Kirim" />' +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '</div>' +
                    '</div>'
                    );

            $("#depo-amount").keyup(function (e) {
                if (e.which == 13) {
                    $("#depo-sbm").click();
                } else {
                    var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(",");
                    var amount = parseInt($(this).val().trim());
                    if (amount >= 10000)
                        $("#depo-cr").animateNumber({number: (amount / 100), numberStep: comma_separator_number_step}, 200);
                    else
                        $("#depo-cr").text("0");
                }
            });

            $("#depo-sbm").click(function () {
                soundPlay("click");
                var amount = parseInt($("#depo-amount").val().trim());
                if (amount >= 50000) {
                    swal({
                        title: "Konfirmasi",
                        text: "Jumlah Yang Akan Dideposit: " + amount + " IDR, Lanjutkan?",
                        buttons: ["Tidak", "Ya"]
                    }).then(function (confirm) {
                        if (confirm) {
                            var data = "kdp:" + amount.toString();
                            sendData(data);
                        }
                    });

                } else
                    swal("Perhatian", "Minimum Deposit IDR 50,000!");
            });
            break;
        case "cancel":
            $("body").attr("data-wd", 1);
            sendData("o:");
            break;
        case "pass":
            $("body").append(
                    '<div class="sub-menu-overlay fadeIn">' +
                    '<div class="sub-menu" onclick="event.stopPropagation();">' +
                    '<div class="sub-menu-close"><i class="fa fa-times"></i></div>' +
                    '<h2 style="margin-bottom:10px;"><i class="fa fa-lock"></i> Ganti Password</h2>' +
                    '<table width="100%" id="chpass-table">' +
                    '<tr>' +
                    '<td>Password</td>' +
                    '<td><input id="chpass-old" type="password" placeholder=" masukkan password" max-length="200" style="width:100%;"/></td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>Password Baru</td>' +
                    '<td><input id="chpass-new" type="password" placeholder=" masukkan password baru" max-length="200" style="width:100%;"/></td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>Ulang Password</td>' +
                    '<td><input id="chpass-new2" type="password" placeholder=" masukkan ulang password baru" max-length="200" style="width:100%;"/></td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td colspan="2" align="right">' +
                    '<input id="chpass-sbm" type="button" value="Kirim" />' +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '</div>' +
                    '</div>'
                    );
            
            $("#chpass-table input").keyup(function(e){
                if(e.which == 13)
                    $("#chpass-sbm").click();
            });
            
            $("#chpass-sbm").click(function () {
                soundPlay("click");
                var oldpass = $("#chpass-old").val().trim();
                var newpass = $("#chpass-new").val().trim();
                var newpass2 = $("#chpass-new2").val().trim();

                if (oldpass && newpass && newpass2) {
                    if (newpass === newpass2) {
                        if (newpass.length > 5) {
                            var data = "l:" + player.username + ";" + oldpass + ";" + newpass;
                            sendData(data);
                        } else
                            swal("Perhatian", "Panjang Password Minimal 6 Karakter!");
                    } else
                        swal("Perhatian", "Password Baru Tidak Sama!");
                } else
                    swal("Perhatian", "Harap Masukkan Data Yang Dibutuhkan Terlebih Dahulu!");
            });
            break;
        case "settings":
            $("body").append(
                    '<div class="sub-menu-overlay fadeIn">' +
                    '<div class="sub-menu" onclick="event.stopPropagation();" style="width:350px;">' +
                    '<div class="sub-menu-close"><i class="fa fa-times"></i></div>' +
                    '<h2><i class="fa fa-gear"></i> Settings</h2>' +
                    '<table width="100%" style="margin-top:10px;">' +
                    '<tr>' +
                    '<td colspan="2" class="light-green-color">Gambar Kartu</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td valign="middle">' +
                    '<div class="settings-card-img" style="background:url(\'/assets/game/img/card-1.gif\') 0 0;background-size:1290%;">&nbsp;</div>' +
                    '<div class="settings-card" data-card="1"><i class="fa fa-check fa-lg"></i></div>' +
                    '&nbsp;&nbsp;&nbsp;&nbsp;' +
                    '<div class="settings-card-img" style="background:url(\'/assets/game/img/card-2.png\') 0 0;background-size:1290%;">&nbsp;</div>' +
                    '<div class="settings-card" data-card="2"><i class="fa fa-check fa-lg"></i></div>' +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '<table width="100%">' +
                    '<tr>' +
                    '<td colspan="2" class="light-green-color">Suara</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>Hidupkan / matikan musik permainan</td>' +
                    '<td>' +
                    '<div class="settings-switch" data-settings="music">' +
                    '<div class="button">OFF</div>' +
                    '<div class="label">OFF</div>' +
                    '<div class="label">ON</div>' +
                    '<div style="clear:both;"></div>' +
                    '</div>' +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td colspan="2" class="light-green-color">Fast Speed</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>Kecepatan membuka kartu saat permainan OFF = kecepatan normal</td>' +
                    '<td>' +
                    '<div class="settings-switch" data-settings="speed">' +
                    '<div class="button">OFF</div>' +
                    '<div class="label">OFF</div>' +
                    '<div class="label">ON</div>' +
                    '<div style="clear:both;"></div>' +
                    '</div>' +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '</div>' +
                    '</div>'
                    );

            if (settings.music == "on") {
                $(".settings-switch[data-settings='music']").addClass("active");
                $(".settings-switch[data-settings='music'] .button").text("ON");
            }

            if (settings.speed == "50") {
                $(".settings-switch[data-settings='speed']").addClass("active");
                $(".settings-switch[data-settings='speed'] .button").text("ON");
            }

            $(".settings-card[data-card='" + settings.card + "']").addClass("active");

            $(".settings-card").click(function () {
                var card = $(this).attr("data-card");
                settings.card = card;
                localStorage.settings = JSON.stringify(settings);

                $(".nodef-card").remove();
                if (card != "1")
                    $("head").append("<link class='nodef-card' rel='stylesheet' href='/assets/game/css/card" + card + ".css?v=5'/>");

                soundPlay("click");
                $(".settings-card").removeClass("active");
                if (!$(this).hasClass("active")) {
                    $(this).addClass("active");
                }
            });

            $(".settings-switch").click(function () {
                soundPlay("click");
                var data = $(this).attr("data-settings");

                if (!$(this).hasClass("active")) {
                    $(this).addClass("active");
                    $(this).find(".button").text("ON");
                    if (data == "music") {
                        settings.music = "on";
                        soundPlay("background");
                    } else
                        settings.speed = 50;
                } else {
                    $(this).removeClass("active");
                    $(this).find(".button").text("OFF");
                    if (data == "music") {
                        settings.music = "off";
                        $("#backgroundAudio")[0].pause();
                    } else
                        settings.speed = 150;
                }

                localStorage.settings = JSON.stringify(settings);
            });
            break;
        case "help":
            $("body").append(
                    '<div class="sub-menu-overlay fadeIn">' +
                    '<div class="sub-menu" onclick="event.stopPropagation();">' +
                    '<div class="sub-menu-close"><i class="fa fa-times"></i></div>' +
                    '<h2><i class="fa fa-info-circle"></i> Bantuan</h2>' +
                    '<table width="100%">' +
                    '<tr>' +
                    '<th colspan="4" class="light-green-color">Keyboard</th>' +
                    '</tr>' +
                    '<tr>' +
                    '<td colspan="4">' +
                    '<div style="display:block;border-top:1px solid #666;height:1px;">&nbsp;</div>' +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>Deal / Bet</td>' +
                    '<td width="30%">' +
                    '<div class="help-keyboard" style="background:url(\'/assets/game/img/keyboard.png\') 0 -2px;">&nbsp;</div>' +
                    '<div class="help-keyboard" style="background:url(\'/assets/game/img/keyboard.png\') -36px -2px;">&nbsp;</div>' +
                    '</td>' +
                    '<td>Skip / Buang Kartu</td>' +
                    '<td>' +
                    '<div class="help-keyboard" style="background:url(\'/assets/game/img/keyboard.png\') 0 -36px;">&nbsp;</div>' +
                    '<div class="help-keyboard" style="background:url(\'/assets/game/img/keyboard.png\') -36px -36px;">&nbsp;</div>' +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>Transfer</td>' +
                    '<td>' +
                    '<div class="help-keyboard" style="background:url(\'/assets/game/img/keyboard.png\') 40px -36px;">&nbsp;</div>' +
                    '<div class="help-keyboard" style="background:url(\'/assets/game/img/keyboard.png\') 40px -72px;">&nbsp;</div>' +
                    '</td>' +
                    '<td>Isi / Insert Coin</td>' +
                    '<td>' +
                    '<div class="help-keyboard" style="background:url(\'/assets/game/img/keyboard.png\') 0 -72px;">&nbsp;</div>' +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>Coin Out</td>' +
                    '<td>' +
                    '<div class="help-keyboard" style="background:url(\'/assets/game/img/keyboard.png\') -36px -72px;">&nbsp;</div>' +
                    '</td>' +
                    '<td>Colokan</td>' +
                    '<td>' +
                    '<div class="help-keyboard" style="background:url(\'/assets/game/img/keyboard.png\') -36px 108px;">&nbsp;</div>' +
                    '<div class="help-keyboard" style="background:url(\'/assets/game/img/keyboard.png\') -72px 108px;">&nbsp;</div>' +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '</div>' +
                    '</div>'
                    );
            break;
        case "transaction":
            $(".right-1").load("/assets/game/page/home/" + page + ".html", function () {
                var data = "o:";
                sendData(data);
            });
            break;
        case "transfer":
            $(".right-1").load("/assets/game/page/home/" + page + ".html", function () {
                $("#trf-sbm").click(function () {
                    soundPlay("click");

                    var recipient = $("#trf-username").val().trim();
                    var credit = $("#trf-credit").val().trim();
                    var pass = $("#trf-pass").val().trim();
                    var phone = $("#trf-phone").val().trim();

                    if (recipient && credit && pass && phone) {
                        if (parseInt(credit) <= parseInt(player.credit)) {
                            if (parseInt(credit) >= 1000) {
                                swal({
                                    title: "Konfirmasi",
                                    text: "Transfer " + number_format(credit) + " Credit ke " + recipient + ", Lanjutkan?",
                                    buttons: ["Tidak", "Ya"]
                                }).then(function (confirm) {
                                    if (confirm) {
                                        var data = "q:" + recipient + ";" + credit + ";" + pass + ";" + phone + ";";
                                        sendData(data);
                                    }
                                    $("input[type='text'],input[type='password'],input[type='number']").val("");
                                });
                            } else
                                swal("Perhatian", "Minimum Transfer: 1,000 Credit!");
                        } else
                            swal("Perhatian", "Jumlah Credit Tidak Cukup!");
                    } else
                        swal("Perhatian", "Harap Isi Semua Data Yang Dibutuhkan!");
                });
                inputClick();
            });
            break;
    }
    
    $(".sub-menu-overlay,.sub-menu-close").click(function () {
        $.when($(".sub-menu-overlay").fadeOut(150)).then(function () {
            $(".sub-menu-overlay").remove();
        });
    });
    inputClick();
}

function redrawChat(first) {
    var init = 0;
    if ((sysmsg.length - 11) > -1)
        init = sysmsg.length - 11;

    $(".info-chat-messages").html("");
    for (var i = init; i < sysmsg.length; i++)
        sendChat(sysmsg[i].sender, sysmsg[i].msg, sysmsg[i].role, first);
    $(".message .text").linkify();
}

function sendChat(sender, msg, isadmin, first) {
    if (msg) {
        var date = formatDate(new Date());
        var admin = (isadmin) ? "admin" : "";
        var msgbubble =
                '<div class="message ' + admin + '">' +
                '<div class="time" title="' + date + '"><b>' + sender + '</b> <i class="fa fa-clock-o"></i> ' + date + '</div>' +
                '<div class="text">' + msg + '</div>' +
                '</div>';

        $(".info-chat-messages").append(msgbubble);
        $(".info-chat-messages").animate({scrollTop: $(".info-chat-messages")[0].scrollHeight}, 200);
        $(".message .text").linkify();
        if (!first)
            $("#info-chat").val("").focus();
    }
}

function specialTranslate(code) {
    var arr = [
        "RYL",
        "RYL",
        "RYL",
        "RYL",
        "5K",
        "5K",
        "5K",
        "5K",
        "STR",
        "STR",
        "STR",
        "STR",
        "4K",
        "4K",
        "4K",
        "4K",
        "RFM",
        "RFM",
        "RFM",
        "RFM",
        "6K",
        "6K",
        "6K",
        "6K",
        "STM",
        "STM",
        "STM",
        "STM",
        "4KM",
        "4KM",
        "4KM",
        "4KM",
        "RFY",
        "RFY",
        "RFY",
        "RFY",
        "5KY",
        "5KY",
        "5KY",
        "5KY",
        "SFY",
        "SFY",
        "SFY",
        "SFY",
        "4KY",
        "4KY",
        "4KY",
        "4KY",
        "SFS",
        "SFS",
        "SFS",
        "SFS",
        "RF5",
        "RF5",
        "RF5",
        "RF5",
        "RFS",
        "RFS",
        "RFS",
        "RFS"
    ];

    var translated = "";
    code = code.split("");
    for (var i = 0; i < code.length; i++) {
        if (code[i].trim()) {
            if (code[i] != "/") {
                code[i] = arr[code[i].charCodeAt(0) - 66];
                var reds = ["RFS", "RF5", "STM", "4KM", "STR", "5K", "RYL"];
                var blues = ["4KY", "5KY", "SFY", "SFS"];

                if (reds.indexOf(code[i]) > -1)
                    code[i] = '<span style="color:#bf0000;font-weight:bold;">' + code[i] + '</span>';
                else if (blues.indexOf(code[i]) > -1)
                    code[i] = '<span style="color:#36399e;font-weight:bold;">' + code[i] + '</span>';

                translated += code[i] + " ";
            } else
                translated += "/ ";
        }
    }
    return translated;
}

function getTransactCode(code) {
    var data = {}, trans, color;
    switch (code) {
        case "ADJ":
            trans = "PENYESUAIAN";
            color = "#00ff00";
            break;
        case "DEP":
            trans = "DEPOSIT";
            color = "#7d7dff";
            break;
        case "DEB":
            trans = "BONUS DEPOSIT";
            color = "#ff00ff";
            break;
        case "WDR0":
        case "WDR1":
            trans = "CANCEL";
            color = "#ff0000";
            break;
        case "TR TO":
            trans = "TRF KE";
            color = "#ffff00";
            break;
        case "TR FR":
            trans = "TRF DR";
            color = "#ffff00";
            break;
        default:
            trans = code;
            color = "#999";
            var left = trans.substring(0, 3);
            if (left == "HDL")
                trans = code.replace("HDL", "HADIAH LEVEL");
            else if (left == "HCP") {
                trans = code.replace("HCP", "HADIAH PANGERAN");
                color = "#00f";
            }
            else if (left == "HGB") {
                trans = code.replace("HGB", "");
                trans = getTitle(parseInt(trans));
                color = "#ff00ff";
            }
            break;
    }

    data.trans = trans;
    data.color = color;
    return data;
}

function getTitle(code) {
    switch (code) {
        case 0:
        case 1:
            return "SATU STEP";
            break;
        case 2:
            return "JOKER MERAH";
            break;
        case 3:
            return "SIKIPUL";
            break;
        case 4:
            return "BEBAS PROTEKSI";
            break;
        case 5:
            return "KSATRIA WAJIK";
            break;
        case 6:
            return "PANGERAN WARU";
            break;
        case 7:
            return "SELIR HATI";
            break;
        case 8:
            return "BOTAK KERITING";
            break;
        case 9:
            return "RAJA MINYAK";
            break;
        case 10:
            return "AMPUN BOS!";
            break;
        case 11:
            return "ROYAL MURNI";
            break;
        case 12:
            return "ACE KING";
            break;
        default:
            if (code > 12 && code < 21)
                return "TANPA TANDING";
            else if (code > 20 && code < 31)
                return "BELUM ADA JUDUL";
            else
                return "HINGGA AJAL";
            break;
    }
}

function getCard(id) {
    var arr = [
        "cover",
        "ace-spade-1", "two-spade-1", "three-spade-1", "four-spade-1", "five-spade-1", "six-spade-1", "seven-spade-1", "eight-spade-1", "nine-spade-1", "ten-spade-1", "jack-spade-1", "queen-spade-1", "king-spade-1",
        "ace-heart-1", "two-heart-1", "three-heart-1", "four-heart-1", "five-heart-1", "six-heart-1", "seven-heart-1", "eight-heart-1", "nine-heart-1", "ten-heart-1", "jack-heart-1", "queen-heart-1", "king-heart-1",
        "ace-diamond-1", "two-diamond-1", "three-diamond-1", "four-diamond-1", "five-diamond-1", "six-diamond-1", "seven-diamond-1", "eight-diamond-1", "nine-diamond-1", "ten-diamond-1", "jack-diamond-1", "queen-diamond-1", "king-diamond-1",
        "ace-club-1", "two-club-1", "three-club-1", "four-club-1", "five-club-1", "six-club-1", "seven-club-1", "eight-club-1", "nine-club-1", "ten-club-1", "jack-club-1", "queen-club-1", "king-club-1",
        "joker-black", "joker-red"
    ];
    return arr[id];
}

function exitHandler(e) {
    if (!isFullScreen())
        askFullScreen();
}

function askFullScreen() {
    swal({
        title: "Perhatian",
        text: "Untuk Memainkan Game Ini Harus Di Layar Full-Screen, Lanjutkan?",
        buttons: ["Tidak, Keluar Saja", "Ya"]
    }).then(function (confirm) {
        if (confirm) {
            soundPlay("background");
            screen.orientation.lock("landscape");

            var elem = document.querySelector("html");
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) { /* Firefox */
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { /* IE/Edge */
                elem.msRequestFullscreen();
            }
        } else {
            localStorage.removeItem("player");
            localStorage.removeItem("credential");
            window.location.href = (mainhref.indexOf("?y") > -1) ? "/?y" : "/";
        }
    });
}

function soundPlay(sound, id) {
    if (settings.music == "on") {
        switch (sound) {
            case "background":
                //$("#backgroundAudio")[0].play();
                break;
            case "click":
               // $("#clickAudio")[0].play();
                break;
            case "flip":
              //  $("#flipAudio")[0].play();
                break;
            default:
                $("#audio" + id)[0].play();
                break;
        }
    }
}

function inputClick() {
    var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (!iOS && isMobile()) {
        $("input[type='text'],input[type='password'],input[type='number'],input[type='email']").off("focus").on("focus", function () {
            var eltop = $(this).offset().top;
            var half = $(window).height() * 0.35;
            var top = 0;

            if (eltop >= half)
                top = eltop - half + 40;
            else if (half - eltop < 40)
                top = 40;

            // $("html").addClass("focused").css("top", "-" + top + "px");
        });

        $("input[type='text'],input[type='password'],input[type='number'],input[type='email']").off("blur").on("blur", function () {
            // $("html").removeClass("focused").css("top", "0");
        });
    }
}