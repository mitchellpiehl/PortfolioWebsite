// Research page: paper tabs, the worked examples, and the charts.
// Each chart is drawn from the data table inside its <figure>, so the numbers
// live in one place and the table doubles as the accessible version.
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var toArray = function (list) { return Array.prototype.slice.call(list); };

  function svg(name, attrs, parent) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function label(parent, x, y, content, cls, anchor) {
    var node = svg("text", { x: x, y: y, "class": cls || "", "text-anchor": anchor || "start" }, parent);
    node.textContent = content;
    return node;
  }

  var measurer = document.createElement("canvas").getContext("2d");
  function textWidth(content, weight) {
    measurer.font = (weight || 400) + " 13px 'IBM Plex Sans', system-ui, sans-serif";
    return measurer.measureText(content).width;
  }

  function widest(strings, weight) {
    return Math.ceil(Math.max.apply(null, strings.map(function (s) { return textWidth(s, weight); })));
  }

  /* ---------- Paper tabs ---------- */

  var tabs = toArray(document.querySelectorAll(".tab"));
  var panels = tabs.map(function (tab) { return document.getElementById(tab.getAttribute("aria-controls")); });
  var explorer = document.getElementById("explorer");

  function selectTab(index, options) {
    options = options || {};
    tabs.forEach(function (tab, i) {
      var on = i === index;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    if (options.focus) tabs[index].focus();
    if (options.updateUrl) history.replaceState(null, "", "#" + panels[index].id);
    if (options.scroll && explorer.getBoundingClientRect().top < 0) explorer.scrollIntoView({ block: "start" });
  }

  function tabFromHash() {
    var id = location.hash.slice(1);
    for (var i = 0; i < panels.length; i++) if (panels[i].id === id) return i;
    return -1;
  }

  if (tabs.length) {
    panels.forEach(function (panel, i) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabs[i].id);
    });

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { selectTab(i, { updateUrl: true, scroll: true }); });
      tab.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
        if (event.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        if (next !== null) {
          event.preventDefault();
          selectTab(next, { focus: true, updateUrl: true });
        }
      });
    });

    var start = tabFromHash();
    selectTab(start < 0 ? 0 : start);
    if (start >= 0) {
      requestAnimationFrame(function () { panels[start].scrollIntoView({ block: "start" }); });
    }

    window.addEventListener("hashchange", function () {
      var index = tabFromHash();
      if (index >= 0) {
        selectTab(index);
        panels[index].scrollIntoView({ block: "start" });
      }
    });
  }

  /* ---------- Worked examples ---------- */

  toArray(document.querySelectorAll(".example")).forEach(function (example) {
    var buttons = toArray(example.querySelectorAll(".switch button"));
    if (!buttons.length) return;

    function show(state) {
      buttons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.getAttribute("data-state") === state));
      });
      toArray(example.querySelectorAll("[data-show]")).forEach(function (node) {
        node.classList.toggle("is-shown", node.getAttribute("data-show") === state);
      });
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () { show(button.getAttribute("data-state")); });
    });
    show(example.getAttribute("data-initial") || buttons[0].getAttribute("data-state"));
  });

  /* ---------- Charts ---------- */

  function readTable(figure) {
    var table = figure.querySelector(".chart-table table");
    var heads = toArray(table.querySelectorAll("thead th")).slice(1);
    var columns = heads.map(function (th, i) {
      return {
        index: i,
        label: th.textContent.trim(),
        key: th.getAttribute("data-key") || String(i),
        sort: th.getAttribute("data-sort") || "desc"
      };
    });
    var rows = toArray(table.querySelectorAll("tbody tr")).map(function (tr) {
      return {
        label: tr.querySelector("th").textContent.trim(),
        highlight: tr.hasAttribute("data-highlight"),
        cells: toArray(tr.querySelectorAll("td")).map(function (td) {
          var raw = td.hasAttribute("data-value") ? td.getAttribute("data-value") : td.textContent.replace(/[^0-9.]/g, "");
          var value = parseFloat(raw);
          return { value: isFinite(value) ? value : null, text: td.textContent.trim() };
        })
      };
    });
    return { columns: columns, rows: rows };
  }

  function makeTooltip(plot) {
    var tip = document.createElement("div");
    tip.className = "tooltip";
    tip.setAttribute("aria-hidden", "true");
    var value = document.createElement("strong");
    var name = document.createElement("span");
    tip.appendChild(value);
    tip.appendChild(name);
    plot.appendChild(tip);
    return {
      show: function (valueText, nameText, x, y) {
        value.textContent = valueText;
        name.textContent = nameText;
        tip.classList.add("is-on");
        var left = Math.min(Math.max(x + 14, 0), plot.clientWidth - tip.offsetWidth);
        tip.style.left = left + "px";
        tip.style.top = Math.max(y - tip.offsetHeight - 10, 0) + "px";
      },
      hide: function () { tip.classList.remove("is-on"); }
    };
  }

  function hover(group, plot, tooltip, valueText, nameText) {
    group.addEventListener("pointermove", function (event) {
      var box = plot.getBoundingClientRect();
      tooltip.show(valueText, nameText, event.clientX - box.left, event.clientY - box.top);
    });
    group.addEventListener("pointerleave", tooltip.hide);
  }

  // A bar with a 4px rounded end at the data and a square end at the baseline
  function barPath(x, y, length, height, leftward) {
    var r = Math.min(4, length, height / 2);
    var end = leftward ? x - length : x + length;
    var inner = leftward ? end + r : end - r;
    return "M" + x + "," + y + "H" + inner +
      "Q" + end + "," + y + " " + end + "," + (y + r) +
      "V" + (y + height - r) +
      "Q" + end + "," + (y + height) + " " + inner + "," + (y + height) +
      "H" + x + "Z";
  }

  function startPlot(figure, height) {
    var plot = figure.querySelector(".chart-plot");
    var width = plot.clientWidth;
    plot.textContent = "";
    var root = svg("svg", { width: width, height: height, viewBox: "0 0 " + width + " " + height, "aria-hidden": "true", focusable: "false" });
    plot.appendChild(root);
    return { plot: plot, root: root, width: width, tooltip: makeTooltip(plot) };
  }

  function renderBars(figure, state) {
    var width = figure.querySelector(".chart-plot").clientWidth;
    if (!width) return;
    var col = state.data.columns[state.column];
    var rows = state.data.rows.filter(function (row) { return row.cells[col.index].value !== null; });
    rows.sort(function (a, b) {
      var diff = a.cells[col.index].value - b.cells[col.index].value;
      return col.sort === "asc" ? diff : -diff;
    });

    var narrow = width < 520;
    var labelW = narrow ? 0 : widest(rows.map(function (r) { return r.label; }), 600) + 14;
    var valueW = widest(rows.map(function (r) { return r.cells[col.index].text; }), 600) + 12;
    var max = Math.max.apply(null, rows.map(function (r) { return r.cells[col.index].value; }));
    var trackW = Math.max(width - labelW - valueW, 40);
    var barH = 14;
    var rowH = narrow ? 44 : 30;
    var height = rows.length * rowH;

    var c = startPlot(figure, height);
    svg("line", { x1: labelW + 0.5, x2: labelW + 0.5, y1: 0, y2: height, "class": "axis" }, c.root);

    rows.forEach(function (row, i) {
      var cell = row.cells[col.index];
      var hl = row.highlight ? " is-hl" : "";
      var top = i * rowH;
      var barY = narrow ? top + 21 : top + (rowH - barH) / 2;
      var group = svg("g", { "class": "row" + hl }, c.root);
      svg("rect", { x: 0, y: top, width: width, height: rowH, "class": "hit" }, group);
      if (narrow) label(group, 0, top + 14, row.label, "lbl" + hl);
      else label(group, labelW - 12, barY + barH / 2 + 4.5, row.label, "lbl" + hl, "end");
      var length = Math.max(trackW * cell.value / max, 2);
      svg("path", { d: barPath(labelW, barY, length, barH, false), "class": "bar" + hl }, group);
      label(group, labelW + length + 6, barY + barH / 2 + 4.5, cell.text, "val" + hl);
      var name = state.data.columns.length > 1 ? row.label + " · " + col.label : row.label;
      hover(group, c.plot, c.tooltip, cell.text, name);
    });
  }

  function renderDumbbell(figure, state) {
    var width = figure.querySelector(".chart-plot").clientWidth;
    if (!width) return;
    var rows = state.data.rows;
    var narrow = width < 520;
    var labelW = narrow ? 0 : widest(rows.map(function (r) { return r.label; }), 500) + 16;
    var maxV = parseFloat(figure.getAttribute("data-max")) || 100;
    var step = maxV <= 50 ? 10 : 20;
    var trackW = width - labelW - 16;
    var rowH = narrow ? 56 : 44;
    var plotH = rows.length * rowH;
    var height = plotH + 24;
    var x = function (v) { return labelW + trackW * v / maxV; };

    var c = startPlot(figure, height);
    for (var t = 0; t <= maxV; t += step) {
      svg("line", { x1: x(t), x2: x(t), y1: 0, y2: plotH, "class": t === 0 ? "axis" : "grid" }, c.root);
      label(c.root, x(t), height - 6, String(t), "tick", "middle");
    }

    rows.forEach(function (row, i) {
      var top = i * rowH;
      var cy = narrow ? top + 36 : top + rowH / 2;
      var a = row.cells[0];
      var b = row.cells[1];
      var group = svg("g", { "class": "row" }, c.root);
      svg("rect", { x: 0, y: top, width: width, height: rowH, "class": "hit" }, group);
      if (narrow) label(group, 0, top + 16, row.label, "lbl");
      else label(group, labelW - 12, cy + 4.5, row.label, "lbl", "end");
      svg("line", { x1: x(a.value), x2: x(b.value), y1: cy, y2: cy, "class": "link" }, group);
      svg("circle", { cx: x(a.value), cy: cy, r: 5, "class": "dot-a" }, group);
      svg("circle", { cx: x(b.value), cy: cy, r: 5, "class": "dot-b" }, group);
      var high = a.value >= b.value ? a : b;
      var low = a.value >= b.value ? b : a;
      label(group, x(high.value) + 10, cy + 4.5, high.text, "val");
      label(group, x(low.value) - 10, cy + 4.5, low.text, "val is-hl", "end");
      var drop = (a.value - b.value).toFixed(1);
      hover(group, c.plot, c.tooltip, a.text + " → " + b.text, row.label + " · " + drop + " points lost");
    });
  }

  function renderBaseline(figure, state) {
    var width = figure.querySelector(".chart-plot").clientWidth;
    if (!width) return;
    var base = parseFloat(figure.getAttribute("data-baseline"));
    var rows = state.data.rows;
    var values = rows.map(function (r) { return r.cells[0].value; }).concat([base]);
    // One extra step on the low side leaves room for the label of the longest bar
    var lo = Math.floor(Math.min.apply(null, values) / 2) * 2 - 2;
    var hi = Math.ceil(Math.max.apply(null, values) / 2) * 2;
    var narrow = width < 560;
    var labelW = narrow ? 0 : widest(rows.map(function (r) { return r.label; }), 600) + 16;
    var trackW = width - labelW - 56;
    var barH = 14;
    var rowH = narrow ? 44 : 32;
    var topPad = 26;
    var plotBottom = topPad + rows.length * rowH;
    var height = plotBottom + 24;
    var x = function (v) { return labelW + 8 + trackW * (v - lo) / (hi - lo); };

    var c = startPlot(figure, height);
    for (var t = lo; t <= hi; t += 2) {
      svg("line", { x1: x(t), x2: x(t), y1: topPad - 4, y2: plotBottom, "class": "grid" }, c.root);
      label(c.root, x(t), height - 6, String(t), "tick", "middle");
    }

    rows.forEach(function (row, i) {
      var cell = row.cells[0];
      var hl = row.highlight ? " is-hl" : "";
      var top = topPad + i * rowH;
      var barY = narrow ? top + 21 : top + (rowH - barH) / 2;
      var below = cell.value < base;
      var group = svg("g", { "class": "row" + hl }, c.root);
      svg("rect", { x: 0, y: top, width: width, height: rowH, "class": "hit" }, group);
      if (narrow) label(group, 0, top + 14, row.label, "lbl" + hl);
      else label(group, labelW - 12, barY + barH / 2 + 4.5, row.label, "lbl" + hl, "end");
      var length = Math.max(Math.abs(x(cell.value) - x(base)), 2);
      svg("path", { d: barPath(x(base), barY, length, barH, below), "class": below ? "bar-neg" : "bar-pos" }, group);
      if (below) label(group, x(base) - length - 6, barY + barH / 2 + 4.5, cell.text, "val" + hl, "end");
      else label(group, x(base) + length + 6, barY + barH / 2 + 4.5, cell.text, "val" + hl);
      var diff = Math.abs(cell.value - base).toFixed(2);
      hover(group, c.plot, c.tooltip, cell.text + " AUC", row.label + " · " + diff + (below ? " below" : " above") + " no memory");
    });

    svg("line", { x1: x(base), x2: x(base), y1: topPad - 8, y2: plotBottom, "class": "base" }, c.root);
    var anchor = x(base) > width - 60 ? "end" : "middle";
    label(c.root, x(base), topPad - 12, figure.getAttribute("data-baseline-label") || String(base), "base-lbl", anchor);
  }

  function draw(figure, state) {
    if (state.type === "bars") renderBars(figure, state);
    else if (state.type === "dumbbell") renderDumbbell(figure, state);
    else if (state.type === "baseline") renderBaseline(figure, state);
  }

  function updateNotes(figure, state) {
    var key = state.data.columns[state.column].key;
    toArray(figure.querySelectorAll(".chart-note[data-for]")).forEach(function (note) {
      note.classList.toggle("is-shown", note.getAttribute("data-for") === key);
    });
  }

  var controlCount = 0;
  function buildControls(figure, state) {
    var fieldset = document.createElement("fieldset");
    fieldset.className = "chart-controls";
    var legend = document.createElement("legend");
    legend.textContent = figure.getAttribute("data-controls-label") || "Show";
    fieldset.appendChild(legend);
    var name = "chart-control-" + (++controlCount);
    state.data.columns.forEach(function (col, i) {
      var option = document.createElement("label");
      var input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = col.key;
      input.checked = i === state.column;
      input.addEventListener("change", function () {
        state.column = i;
        updateNotes(figure, state);
        draw(figure, state);
      });
      option.appendChild(input);
      option.appendChild(document.createTextNode(col.label));
      fieldset.appendChild(option);
    });
    figure.insertBefore(fieldset, figure.querySelector(".chart-plot"));
  }

  function buildLegend(figure, state) {
    var list = document.createElement("ul");
    list.className = "chart-legend";
    ["is-a", "is-b"].forEach(function (cls, i) {
      var item = document.createElement("li");
      var dot = document.createElement("span");
      dot.className = "dot " + cls;
      dot.setAttribute("aria-hidden", "true");
      item.appendChild(dot);
      item.appendChild(document.createTextNode(state.data.columns[i].label));
      list.appendChild(item);
    });
    figure.insertBefore(list, figure.querySelector(".chart-plot"));
  }

  function buildTableToggle(figure) {
    var table = figure.querySelector(".chart-table");
    var button = document.createElement("button");
    button.type = "button";
    button.className = "table-toggle";
    button.setAttribute("aria-expanded", "false");
    button.textContent = "Show the numbers";
    button.addEventListener("click", function () {
      var open = figure.classList.toggle("show-table");
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? "Hide the numbers" : "Show the numbers";
    });
    table.parentNode.insertBefore(button, table);
  }

  var charts = toArray(document.querySelectorAll("figure.chart[data-chart]")).map(function (figure) {
    var state = { type: figure.getAttribute("data-chart"), data: readTable(figure), column: 0 };
    if (state.type === "bars" && state.data.columns.length > 1) buildControls(figure, state);
    if (state.type === "dumbbell") buildLegend(figure, state);
    buildTableToggle(figure);
    updateNotes(figure, state);

    var plot = figure.querySelector(".chart-plot");
    if ("ResizeObserver" in window) {
      var lastWidth = 0;
      new ResizeObserver(function () {
        var width = plot.clientWidth;
        if (width && width !== lastWidth) {
          lastWidth = width;
          draw(figure, state);
        }
      }).observe(plot);
    } else {
      draw(figure, state);
      window.addEventListener("resize", function () { draw(figure, state); });
    }
    return { figure: figure, state: state };
  });

  // Label widths depend on the web font, so redraw once it has loaded
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      charts.forEach(function (chart) { draw(chart.figure, chart.state); });
    });
  }
})();
