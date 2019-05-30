
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

var $ = require("jquery");

function scrollTo(div, to){
    return $(div).animate({scrollTop: $(to).position().top - $(div).parent().offset().top}, 300);
}

function scrollToDown(div, to){

    console.log(div, to);

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

    console.log(div, to);

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

module.exports = {scrollTo, scrollToDown, scrollToUp}

