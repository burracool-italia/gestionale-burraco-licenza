// Modulo «Richiedi la licenza d'uso» di Burraco il tuo Torneo.
// Manda i dati al server del titolare (POST /richiesta-licenza); se il server non risponde
// propone l'invio per email dello stesso testo, cosi' la richiesta non va persa.
(function () {
  "use strict";

  var SERVER = "https://web-production-c734e.up.railway.app";
  var EMAIL = "burracool.italia@gmail.com";
  var VERSIONE_CONDIZIONI = "1.0 del 10/11/2026";

  var LICENZE = {
    prova: { nome: "Prova gratuita – 30 giorni", prezzo: "€ 0", nota: "Nessun pagamento. Alla fine dei 30 giorni decidi tu se acquistare." },
    semestrale: { nome: "Licenza semestrale – 6 mesi", prezzo: "€ 59,90", nota: "Importo non soggetto a IVA. Pagamento con PayPal dopo la nostra conferma." },
    annuale: { nome: "Licenza annuale – 12 mesi", prezzo: "€ 99,90", totale: "€ 101,90", nota: "Importo non soggetto a IVA. Si aggiungono € 2,00 di imposta di bollo sulla ricevuta: totale € 101,90. Pagamento con PayPal dopo la nostra conferma." }
  };
  var SOGGETTI = { circolo: "Circolo o associazione", impresa: "Impresa o professionista", privato: "Privato" };

  var modulo = document.getElementById("modulo");
  var boxErrore = document.getElementById("esito-errore");
  var pulsante = document.getElementById("invia");

  function $(id) { return document.getElementById(id); }
  function scelto(nome) {
    var el = modulo.querySelector('input[name="' + nome + '"]:checked');
    return el ? el.value : "";
  }
  function pulito(id) { return ($(id).value || "").replace(/\s+/g, " ").trim(); }
  function senzaSpazi(id) { return ($(id).value || "").replace(/\s+/g, ""); }

  // ── il modulo cambia secondo le scelte ──
  function aggiornaLicenza() {
    var l = LICENZE[scelto("tipo_licenza")] || LICENZE.prova;
    $("riep-cosa").textContent = l.nome;
    $("riep-quanto").textContent = l.totale || l.prezzo;
    $("riep-nota").textContent = l.nota;
  }

  function aggiornaSoggetto() {
    var tipo = scelto("tipo_soggetto");
    var privato = tipo === "privato";
    $("c-denominazione").classList.toggle("nascosto", privato);
    $("c-partita_iva").classList.toggle("nascosto", privato);
    $("piva-facoltativa").classList.toggle("nascosto", tipo === "impresa");
    $("et-referente").textContent = privato ? "Nome e cognome" : "Legale rappresentante o referente (nome e cognome)";
    $("et-cf").textContent = privato ? "Codice fiscale" : (tipo === "impresa" ? "Codice fiscale dell'impresa" : "Codice fiscale del circolo");
    $("et-indirizzo").textContent = privato ? "Indirizzo di residenza (via e numero civico)" : "Indirizzo della sede (via e numero civico)";
    $("aiuto-soggetto").classList.toggle("nascosto", tipo !== "circolo");
    $("err-cf").textContent = privato
      ? "Il codice fiscale personale ha 16 caratteri."
      : "Il codice fiscale ha 11 cifre (ente) oppure 16 caratteri (persona).";
    $("err-piva").textContent = tipo === "impresa" ? "Scrivi la partita IVA: 11 cifre." : "La partita IVA ha 11 cifre.";
  }

  // ── lettura e controllo ──
  function leggi() {
    var tipo = scelto("tipo_soggetto");
    return {
      tipo_licenza: scelto("tipo_licenza"),
      tipo_soggetto: tipo,
      denominazione: tipo === "privato" ? "" : pulito("denominazione"),
      referente: pulito("referente"),
      codice_fiscale: senzaSpazi("codice_fiscale").toUpperCase(),
      partita_iva: tipo === "privato" ? "" : senzaSpazi("partita_iva").toUpperCase().replace(/^IT/, ""),
      indirizzo: pulito("indirizzo"),
      cap: senzaSpazi("cap"),
      comune: pulito("comune"),
      provincia: senzaSpazi("provincia").toUpperCase(),
      email: ($("email").value || "").trim().toLowerCase(),
      telefono: pulito("telefono"),
      nome_circolo: pulito("nome_circolo"),
      note: ($("note").value || "").trim(),
      accetta_condizioni: $("accetta_condizioni").checked,
      accetta_clausole: $("accetta_clausole").checked,
      letta_privacy: $("letta_privacy").checked,
      versione_condizioni: VERSIONE_CONDIZIONI,
      sito: $("sito").value || ""
    };
  }

  function sbagliati(d) {
    var e = [];
    if (d.tipo_soggetto !== "privato" && !d.denominazione) e.push("c-denominazione");
    if (d.referente.length < 5 || d.referente.indexOf(" ") < 0) e.push("c-referente");
    var cfOk = /^([A-Z0-9]{16}|\d{11})$/.test(d.codice_fiscale);
    if (d.tipo_soggetto === "privato" && d.codice_fiscale.length !== 16) cfOk = false;
    if (!cfOk) e.push("c-codice_fiscale");
    if (d.partita_iva && !/^\d{11}$/.test(d.partita_iva)) e.push("c-partita_iva");
    if (d.tipo_soggetto === "impresa" && !d.partita_iva) e.push("c-partita_iva");
    if (d.indirizzo.length < 5) e.push("c-indirizzo");
    if (!/^\d{5}$/.test(d.cap)) e.push("c-cap");
    if (d.comune.length < 2) e.push("c-comune");
    if (!/^[A-Z]{2}$/.test(d.provincia)) e.push("c-provincia");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(d.email)) e.push("c-email");
    if (d.nome_circolo.length < 2) e.push("c-nome_circolo");
    if (!(d.accetta_condizioni && d.accetta_clausole && d.letta_privacy)) e.push("gruppo-conferme");
    return e;
  }

  function segna(elenco) {
    var segnati = modulo.querySelectorAll(".sbagliato");
    for (var i = 0; i < segnati.length; i++) segnati[i].classList.remove("sbagliato");
    for (var j = 0; j < elenco.length; j++) $(elenco[j]).classList.add("sbagliato");
    if (elenco.length) {
      var primo = $(elenco[0]);
      var campo = primo.querySelector("input:not(:checked), input, textarea");
      primo.scrollIntoView({ block: "center", behavior: "smooth" });
      if (campo) campo.focus({ preventScroll: true });
    }
  }

  // ── testo della richiesta (riepilogo ed email di riserva) ──
  function righe(d) {
    var lic = LICENZE[d.tipo_licenza];
    var r = [["Licenza", lic.nome],
             ["Importo", lic.totale ? lic.prezzo + " + € 2,00 di imposta di bollo = " + lic.totale : lic.prezzo],
             ["Richiesta come", SOGGETTI[d.tipo_soggetto]]];
    if (d.denominazione) r.push(["Denominazione", d.denominazione]);
    r.push([d.tipo_soggetto === "privato" ? "Nome e cognome" : "Rappresentante o referente", d.referente]);
    r.push(["Codice fiscale", d.codice_fiscale]);
    if (d.partita_iva) r.push(["Partita IVA", d.partita_iva]);
    r.push(["Indirizzo", d.indirizzo + ", " + d.cap + " " + d.comune + " (" + d.provincia + ")"]);
    r.push(["Email", d.email]);
    if (d.telefono) r.push(["Telefono", d.telefono]);
    r.push(["Nome del circolo nel programma", d.nome_circolo]);
    if (d.note) r.push(["Note", d.note]);
    return r;
  }

  function testoEmail(d) {
    var t = "Richiesta di licenza d'uso - Burraco il tuo Torneo\n\n";
    righe(d).forEach(function (r) { t += r[0] + ": " + r[1] + "\n"; });
    t += "\nHo letto e accetto le Condizioni di licenza d'uso (versione " + VERSIONE_CONDIZIONI + "), approvo in modo " +
         "specifico gli articoli 6, 7, 9, 11, 13 e 16 e ho letto l'Informativa sul trattamento dei dati personali.\n";
    return t;
  }

  function mostraErrore(messaggio, d) {
    boxErrore.textContent = "";
    var p = document.createElement("p");
    p.textContent = messaggio;
    boxErrore.appendChild(p);
    if (d) {
      var p2 = document.createElement("p");
      p2.appendChild(document.createTextNode("Puoi riprovare tra qualche minuto, oppure "));
      var a = document.createElement("a");
      a.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Richiesta di licenza - " + d.nome_circolo) +
               "&body=" + encodeURIComponent(testoEmail(d));
      a.textContent = "inviare la stessa richiesta per email";
      p2.appendChild(a);
      p2.appendChild(document.createTextNode(" a " + EMAIL + "."));
      boxErrore.appendChild(p2);
    }
    boxErrore.classList.remove("nascosto");
    boxErrore.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function mostraFatto(d, risposta) {
    $("f-numero").textContent = risposta.id;
    $("f-quando").textContent = risposta.quando || new Date().toLocaleString("it-IT");
    $("f-versione").textContent = VERSIONE_CONDIZIONI;
    var tab = $("f-dati");
    tab.textContent = "";
    righe(d).forEach(function (r) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      var td = document.createElement("td");
      th.textContent = r[0];
      td.textContent = r[1];
      tr.appendChild(th);
      tr.appendChild(td);
      tab.appendChild(tr);
    });
    var passi = d.tipo_licenza === "prova"
      ? ["Controlliamo la richiesta e ti scriviamo a " + d.email + ".",
         "Ricevi il programma e i dati per installarlo sul tuo PC.",
         "Hai 30 giorni di prova gratuita. Se vuoi continuare, ci chiedi la licenza semestrale o annuale."]
      : ["Controlliamo la richiesta e ti mandiamo la conferma a " + d.email + ", con la richiesta di pagamento PayPal di " + (LICENZE[d.tipo_licenza].totale || LICENZE[d.tipo_licenza].prezzo) + ".",
         "Ricevuto il pagamento, attiviamo la licenza e ti mandiamo la ricevuta con il programma e i dati per installarlo.",
         "La durata della licenza parte dal giorno dell'attivazione. Alla scadenza non si rinnova da sola."];
    var ol = $("f-passi");
    ol.textContent = "";
    passi.forEach(function (t) {
      var li = document.createElement("li");
      li.textContent = t;
      ol.appendChild(li);
    });
    modulo.classList.add("nascosto");
    $("come-funziona").classList.add("nascosto");
    $("fatto").classList.remove("nascosto");
    $("fatto").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── invio ──
  modulo.addEventListener("submit", function (ev) {
    ev.preventDefault();
    boxErrore.classList.add("nascosto");
    var d = leggi();
    var err = sbagliati(d);
    segna(err);
    if (err.length) return;

    pulsante.disabled = true;
    pulsante.textContent = "Invio in corso…";
    var fine = function () {
      pulsante.disabled = false;
      pulsante.textContent = "Invia la richiesta";
    };
    var scaduto = false;
    var controllo = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { scaduto = true; if (controllo) controllo.abort(); }, 20000);

    fetch(SERVER + "/richiesta-licenza", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
      signal: controllo ? controllo.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (corpo) { return { stato: r.status, corpo: corpo }; });
    }).then(function (esito) {
      clearTimeout(timer);
      fine();
      if (esito.stato === 200 && esito.corpo && esito.corpo.ricevuta) {
        mostraFatto(d, esito.corpo);
      } else if ((esito.stato === 422 || esito.stato === 429) && typeof esito.corpo.detail === "string") {
        mostraErrore(esito.corpo.detail, null);
      } else {
        mostraErrore("Non siamo riusciti a registrare la richiesta: il servizio in questo momento non risponde.", d);
      }
    }).catch(function () {
      clearTimeout(timer);
      fine();
      mostraErrore(scaduto
        ? "Il servizio non ha risposto in tempo: la richiesta potrebbe non essere arrivata."
        : "Non siamo riusciti a inviare la richiesta: il collegamento a internet o il servizio non rispondono.", d);
    });
  });

  modulo.addEventListener("change", function (ev) {
    if (ev.target.name === "tipo_licenza") aggiornaLicenza();
    if (ev.target.name === "tipo_soggetto") aggiornaSoggetto();
  });
  // un campo corretto perde subito il segno rosso
  modulo.addEventListener("input", function (ev) {
    var contenitore = ev.target.closest ? ev.target.closest(".sbagliato") : null;
    if (contenitore) contenitore.classList.remove("sbagliato");
  });
  $("stampa").addEventListener("click", function () { window.print(); });

  aggiornaLicenza();
  aggiornaSoggetto();
})();
