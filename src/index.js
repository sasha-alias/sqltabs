/*
  Copyright (C) 2015  Aliaksandr Aliashkevich

      This program is free software: you can redistribute it and/or modify
      it under the terms of the GNU General Public License as published by
      the Free Software Foundation, either version 3 of the License, or
      (at your option) any later version.

      This program is distributed in the hope that it will be useful,
      but WITHOUT ANY WARRANTY; without even the implied warranty of
      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
      GNU General Public License for more details.

      You should have received a copy of the GNU General Public License
      along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

require('./build/App.js');
var c3 = require('c3');
var d3 = require('d3');

function scrollTo(div, to){
    return $(div).animate({scrollTop: $(to).position().top - $(div).parent().offset().top}, 300);
}

function scrollToDown(div, to){
    var scroll = $(div).scrollTop();
    var position = $(to).offset().top - $(div).offset().top;
    if (position < 0){ // id scrolled away up
        return $(div).scrollTop(position);
    }
    if (position > $(div).height()){ // if scrolled away down
        return $(div).scrollTop(position);
    }
    if (position > $(div).height() - 2*$(to).height()){
        return $(div).scrollTop(scroll + $(to).height());
    }
}

function scrollToUp(div, to){
    var scroll = $(div).scrollTop();
    var position = $(to).offset().top - $(div).offset().top;

    if (position + $(to).height() < 0){ // if scrolled away up
        return $(div).scrollTop(position);
    }
    if (position > $(div).height()){ // if scrolled away down
        return $(div).scrollTop(position);
    }
    if (position - $(to).height() < 0){
        return $(div).scrollTop(scroll - $(to).height());
    }
}


//function mount_tree_chart(chart_id, dataset){
//
//    // drawing
//    var margin = {top: 40, right: 40, bottom: 40, left: 40},
//        width = 960 - margin.left - margin.right,
//        height = 500 - margin.top - margin.bottom;
//
//    var tree = d3.layout.tree()
//        .size([height, width]);
//
//    var diagonal = d3.svg.diagonal()
//        .projection(function(d) { return [d.y, d.x]; });
//
//    var svg = d3.select("[data-chart-id='"+chart_id+"']").append("svg")
//        .attr("width", width + margin.left + margin.right)
//        .attr("height", height + margin.top + margin.bottom)
//      .append("g")
//        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//
//    // data transformation
//
//    var data = dataset.data;
//    // convert list of lists to list of dicts
//    data = data.map(function(d){
//        return {source: d[0], target: d[1], label: d[2]};
//    });
//
//    var nodesByName = {};
//
//    data.forEach(function(link) {
//        var parent = link.source = nodeByName(link.source),
//            child = link.target = nodeByName(link.target);
//        if (parent.children) parent.children.push(child);
//        else parent.children = [child];
//    });
//
//    var nodes = tree.nodes(data[0].source);
//
//
//    // drawing again
//  // Create the link lines.
//  svg.selectAll(".link")
//      .data(data)
//    .enter().append("path")
//      .attr("class", "link")
//      .attr("d", diagonal);
//
//  // Create the node circles.
//  svg.selectAll(".node")
//      .data(nodes)
//    .enter().append("circle")
//      .attr("class", "node")
//      .attr("r", 4.5)
//      .attr("cx", function(d) { return d.y; })
//      .attr("cy", function(d) { return d.x; });
//
//    function nodeByName(name) {
//        return nodesByName[name] || (nodesByName[name] = {name: name});
//    }
//}
