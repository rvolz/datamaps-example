import * as d3 from 'd3'
import Datamap from 'datamaps'
import FileSaver from 'file-saver'
import Annotation from 'd3-svg-annotation'

var map = new Datamap({
    element: document.getElementById('root'),
    geographyConfig: {
        // Heutige Grenzen werden angezeigt -- daher ausgeblendet
        borderWidth: 1,
        borderColor: '#AAA',
        // Standardmäßig wird die Antarktis ausgeblendet
        hideAntarctica: false,
        scope: 'world'
    },
    arcConfig: {
        // ermöglicht Umschlag von östlicher Grenze nach Westen über rechten Rand,
        // ansonsten würden östliche Punkte direkt nach (links) Westen verbunden
        greatArc: true
    },
    bubblesConfig: {
        popupOnHover: false,
        highlightOnHover: false,
    },
    projection: 'equirectangular',
    height: 800,
    width: 1600,
    fills: {
        defaultFill: '#AAA',
        lt50: 'rgba(0,244,244,0.9)',
        gt50: 'red',
        blk: '#AAA',
        wht: '#000',
        start: '#ff4c4c',
        mid: '#fff462'
    }
});

// Erstellt aus einer Reihe von Punkten eine geschlossene Strecke,
// vom ersten Punkt bis zum letzten, und dann wieder zum ersten.
function makeArc(points, options) {
    var arcs = [];
    // Punkte zu einer Strecke verbinden
    var maxPOints = points.length - 1;
    for(var i=0; i<maxPOints; i++) {
        arcs.push({
            origin: {
                longitude: points[i].longitude,
                latitude: points[i].latitude,
            },
            destination: {
                longitude: points[i+1].longitude,
                latitude: points[i+1].latitude
            },
            options: options
        });
    }
    // Strecke schließen: letzten mit erstem Punkt verbinden
    arcs.push({
        origin: {
            longitude: points[maxPOints].longitude,
            latitude: points[maxPOints].latitude
        },
        destination: {
            longitude: points[0].longitude,
            latitude: points[0].latitude
        },
        options: options
    });
    return arcs;
}

// Erstellt an den übergebenen Punkten Kartenmarkierungen
function makeBubbles(points, fk) {
    const bubbles = [];
    points.forEach((data, index) => {
        // Strecke bauen
        var fk = 'wht';
        var radius = 0;
        if (data.type === 'start') {
            radius = 15; fk = 'start';
        } else {
            radius = 10; fk = 'mid';
        }
        bubbles.push({
            name: data.name,
            longitude: data.longitude,
            latitude: data.latitude,
            radius: radius,
            fillKey: fk
        });
    });
    return bubbles;
}


function drawRoutes(route=-1) {
    d3.csv('/data/reiserouten.csv', (error, dataset) => {
        const points = [];
        // Punkte auslesen
        dataset.forEach((data) => {
            const pt = {
                team: data['team'],
                longitude: data['länge'],
                latitude: data['breite'],
                type: data['typ'],
                name: data['name'],
                txt: data['text']
            };
            points.push(pt);
        });

        const npoints = d3.nest()
            .key(d => { return d.team; })
            .entries(points);

        const arcs1 = makeArc(npoints[0].values, {strokeWidth: 3, strokeColor: '#d53e4f'});
        map.arc(arcs1);

        const bubbles1 = makeBubbles(npoints[0].values);
        map.bubbles(bubbles1);

        annotateRoute(route, bubbles1);
    });
}

function annotateRoute(route=-1, bubbles) {
    const anntype = Annotation.annotationLabel;
    const annotations = [];
    bubbles.forEach((data,index) => {
        if (data.radius > 0) {
            const c = map.latLngToXY(data.latitude, data.longitude);
            var dx = 15;
            if (data.longitude >= 170.0) {
                dx = -50;
            } else if (data.longitude <= -170.0) {
                dx = 50;
            }
            var dy = data.radius;
            annotations.push({
                note: {
                    title: data.name,
                },
                x: c[0],
                y: c[1],
                dy: dy,
                dx: dx,
            });
        }
    });

    const makeAnnotations = Annotation.annotation()
        .editMode(false)
        .type(anntype)
        .annotations(annotations)

    // Annotationen werden nicht automatisch gelöscht, daher vorher manuell löschen
    // falls wir neu zeichnen
    d3.select("g.annotation-group").remove()
    // Annotationen anbringen
    d3.select("svg")
        .append("g")
        .attr("class", "annotation-group")
        .style("font-family", '"Helvetica Neue", Helvetica, Arial, sans-serif')
        .style("font-size", "2em")
        .call(makeAnnotations)
    // Hier stylen, sonst fehlt das CSS beim Export
    d3.selectAll("text.annotation-note-title")
        .attr("fill", "black")
}

function writeDownloadLink(){
    try {
        var isFileSaverSupported = !!new Blob();
    } catch (e) {
        alert("blob not supported");
    }

    var html = d3.select("svg")
        .attr("title", "datamaps-beispiel")
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML;

    // Div für die Tooltips am Ende des SVG wird vor dem Speichern gelöscht
    var ndx = html.indexOf('<div class="datamaps-hoverover"');
    if (ndx === -1) { ndx = html.length; }
    const html2 = html.substring(0,ndx);

    const blob = new Blob([html2], {type: "image/svg+xml"});
    FileSaver.saveAs(blob, "datamaps-karte.svg");
}

// Zeichne initial alle Routen
drawRoutes();

// Handler für Tastensteuerung
d3.select("#generate").on("click", writeDownloadLink);
