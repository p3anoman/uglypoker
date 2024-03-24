// Texas Holdem Poker
// Copyright 2020 John McKeon
// All Rights Reserved
import * as Croquet from '@croquet/croquet';
import 'bootstrap/dist/css/bootstrap.min.css';
//import 'page-synchronizer';

function cardClass() { return " class=\"card\"" }

class Player {
  constructor(aName,anAmount,aSeat) {
    this.playerName = aName;
    this.stack = anAmount;
    this.seat = aSeat;
    this.cards = [];
  }
}

class PokerModel extends Croquet.Model {
  init() {
    this.Cards = new Array();
    this.Deck = new Array();
    this.players = new Map();
    this.visitors = new Map();
    this.flop=["blank","blank","blank"];
    this.turn="blank";
    this.river="blank";
    this.currentCard = 0;
    this.button = 0;
    this.bigBlind = 0;
    this.smallBlind = 0;
    this.state="blind";
    this.createCards();
    this.subscribe(this.id,"deal",this.deal);
    this.subscribe(this.id,"rename",this.doRename);
    this.subscribe(this.sessionId,"view-join",this.viewJoin);
    this.subscribe(this.seasionId,"view-exit",this.viewExit);
  }

  static types() {
    return { "PlayerClass": Player }
  }

  createCards() {
    var suits=new Array("spades", "hearts", "clubs", "diamonds");
    for (let suit=0; suit<4; suit++) {
      for (let i=1; i<14; i++) {
        this.Cards.push(suits[suit]+i);
      }
    }
  }

  shuffle() {
    var x,deal = new Array().concat(this.Cards);
    this.Deck.length=0;
    for (let i=51; i>-1; i--) {
      x=Math.floor(Math.random()*i);
      this.Deck.push(deal[x]);
      deal.splice(x,1);
    }
    this.currentCard=0;
  }

  ante() {}

  hands() {
    var e=this.players.values(),
        hand,plyr;
    plyr=e.next();
    while (!plyr.done) {
      plyr.value.cards=[this.Deck[this.currentCard++]];
      plyr=e.next();
    }
    e=this.players.values();
    plyr=e.next();
    while (!plyr.done) {
      plyr.value.cards.push(this.Deck[this.currentCard++]);
      plyr=e.next();
    }
    e=this.players.keys();
    plyr=e.next();
    while (!plyr.done) {
      this.publish(plyr.value,"hand",this.players.get(plyr.value).cards);
      plyr=e.next();
    }
  }

  deal() {
    if (this.state == "blind") {
      this.shuffle();
      this.hands();
      this.state="flop";
      return;
    }
    if (this.state=="flop") {
      this.flop=[];
      this.currentCard++;
      this.flop.push(this.Deck[this.currentCard++]);
      this.flop.push(this.Deck[this.currentCard++]);
      this.flop.push(this.Deck[this.currentCard++]);
      this.publish("update","cards","Turn");
      this.state = "turn";
      return;
    }
    if (this.state == "turn") {
      this.currentCard++;
      this.turn=this.Deck[this.currentCard++];
      this.publish("update","cards","River");
      this.state = "river";
      return;
    }
    if (this.state == "river") {
      this.currentCard++;
      this.river=this.Deck[this.currentCard++];
      this.publish("update","cards","Show");
      this.state = "show";
      return;
    }
    if (this.state == "show") {
      this.publish("update","reveal");
      this.state="reset";
      return;
    }
    if (this.state=="reset") {
      this.flop=["blank","blank","blank"];
      this.turn="blank";
      this.river="blank";
      this.publish("poker","reset");
      this.state = "blind";
    }
  }

  viewJoin(viewId) {
    if (!this.players.has(viewId)) {
      if (!this.dealer) { this.dealer = viewId }
      var nm,st,sz = this.players.size;
      if (sz < 6) {
        nm = "Player" + (sz+1);
        st = "seat" + (sz+1);
        this.players.set(viewId, new Player(nm,1000,st));
        if ((sz==1)&(!this.button)) { this.button = viewId };
        if ((sz==2)&(!this.bigBlind)) { this.bigBlind = viewId };
        if ((sz==3)&(!this.smallBlind)) { this.smallBlind = viewId };

        this.publish("update","players");
        //this.publish(viewId,"player-name",nm);
      }
      else {
        exists = this.views.get(viewId);
        if (!exists) {
          this.views[viewId] = {visitorName: "Visitor" + (this.views.size + 1)};
          this.publish("update","visitors");
        }
      }
    }
  }

  doRename(data) {
    if (data.newName === "") { return; }
    let plyr = this.players.get(data.view);
    plyr.playerName = data.newName;
    this.publish("update","players");
  }

  viewExit(viewId) {
    var isplayer = this.players.get(viewId);
    if (isplayer) {
      delete this.players[viewId];
      this.publish("update","players");
    }
    else {
      this.views[viewId];
      this.publish("update","visitors");
    }
  }

  stateString() {
    if (this.state=="blind") { return "Deal" }
    if (this.state=="flop") { return "Flop" }
    if (this.state=="turn") { return "Turn" }
    if (this.state=="river") { return "River" }
    if (this.state=="show") { return "Show" }
    if (this.state=="reset") { return "Deal" }
  }
}

PokerModel.register("PokerModel");

class PokerTable extends Croquet.View {
  constructor(model) {
    super(model);
    this.model = model;
    deal.enabled = this.model.dealer === this.viewId
    if (deal.enabled) {
      deal.onclick = event => this.onClick(event);
    }
    this.subscribe("update","players",this.updatePlayers);
    this.subscribe("update","visitors",this.updateVisitors);
    this.subscribe("update","cards",this.updateCards);
    this.subscribe("poker","reset",this.doReset);
    this.subscribe(this.viewId,"hand",this.updateHand);
    this.subscribe("update","reveal",this.doReveal);
    //this.subscribe(this.viewId,"player-name",this.playerName);
    this.updatePlayers();
    this.updateCards(this.model.stateString());
    //this.playerName();

    const { App } = Croquet;
    const url = App.sessionURL = window.location.href;
    const qrCode = App.makeQRCanvas();
    qr.innerHTML = `<p class="no-select">Scan to join</p>`;
    qr.onclick = evt => {
        evt.preventDefault();
        evt.stopPropagation();
        window.open(url);
    };
    qr.appendChild(qrCode);

    if (chat.childElementCount > 0) { vdo.remove() }
    let q = new URLSearchParams(document.location.search).get("q");
    console.log("URL q: "+q);
    let iframe = document.createElement('iframe');
    iframe.id="vdo";
    iframe.allow="autoplay;camera;microphone;"
    iframe.src="https://vdo.ninja/?room=uglypoker_"+q+"&transparent"
    iframe.style="height:100%;width:100%";
    chat.appendChild(iframe);
  }

  playerName(dflt) {
//    let nm = window.prompt("Enter player name",dflt);
  //  if (nm === null) { return }
    //this.publish(this.model.id,"rename",{view: this.viewId,newName: nm});
  }

  onClick(event) {
    //if (this.viewId != this.model.button) {return};
    this.publish(this.model.id,"deal");
  }

  doReset() {
    var blank="<img src=\"cards/blank.png\"" + cardClass() + "/>";
    flop1.innerHTML=blank;
    flop2.innerHTML=blank;
    flop3.innerHTML=blank;
    turn.innerHTML=blank ;
    river.innerHTML=blank;
    me1.innerHTML=blank;
    me2.innerHTML=blank;
    seat1cards.innerHTML=blank+blank;
    seat2cards.innerHTML=blank+blank;
    seat3cards.innerHTML=blank+blank;
    seat4cards.innerHTML=blank+blank;
    seat5cards.innerHTML=blank+blank;
    seat6cards.innerHTML=blank+blank;
    deal.innerText="Deal";
  }

  updatePlayers() {
    var seat,html,list="";
    this.model.players.forEach((player,key) => {
      seat=document.getElementById(player.seat);
      if (!seat) { debug.innerText = "Seat for " + player.playerName + " not found"; return }

      html="<div>" + player.playerName + "</div>" +
             "<div>" + player.stack + "</div>";
      if (this.model.button==key.value) {
        html += "<div class=\"button\"><img src=\"button.png\" alt=\"button\"/></div>"
      }
      else if (this.model.smallBlind==key.value) {
        html += "<div class=\"smallblind\"><img src=\"smallBlind.png\" alt=\"small blind\"/><</div>"
      }
      else if (this.model.bigBlind==key.value) {
        html += "<div class=\"bigblind\"><img src=\"bigBlind.png\" alt=\"big blind\"/><</div>"
      };
      html += "<div id=\""+player.seat+"cards\"></div>";
      seat.innerHTML = html;

      //Add to list
      //list += "<li>"+player.playerName+"</li>"
    });

    //html = "";
    //this.model.visitors.forEach((visitor) => {
    //  html += "<li>"+visitor.playerName+"</li>"
    //})
    //chatlist.innerHTML = list;
  }

  updateVisitors() {}

  updateCards(data) {
    flop1.innerHTML="<img src=\"cards/"+this.model.flop[0]+".png\"" + cardClass() + "/>";
    flop2.innerHTML="<img src=\"cards/"+this.model.flop[1]+".png\"" + cardClass() + "/>";
    flop3.innerHTML="<img src=\"cards/"+this.model.flop[2]+".png\"" + cardClass() + "/>";
    turn.innerHTML="<img src=\"cards/"+this.model.turn+".png\"" + cardClass() + "/>" ;
    river.innerHTML="<img src=\"cards/"+this.model.river+".png\"" + cardClass() + "/>";
    deal.innerText=data
  }

  updateHand(data) {
    me1.innerHTML="<img src=\"cards/"+data[0]+".png\"" + cardClass() + "/>";
    me2.innerHTML="<img src=\"cards/"+data[1]+".png\"" + cardClass() + "/>";
    deal.innerText="Flop";
  }

  doReveal() {
    this.model.players.forEach((player) => {
      var cards=document.getElementById(player.seat+"cards");
      cards.innerHTML="<img src=\"cards/"+player.cards[0]+".png\"" + cardClass() + "/>"+
                     "<img src=\"cards/"+player.cards[1]+".png\"" + cardClass() + "/>";
    });
    deal.innerText = "New Hand";
  }
}

const apiKey = "1m5nMszAACuG8f9ADpq6F25PrIb5LhyHlx6rjDHbd";
//const apiKey = "1fe9JcnxEtqebmrahC10k5JnoeahGpNs4sKFmGbxl"; //production key
const appId = "com.uglypoker";
const name = Croquet.App.autoSession();
const password = "acesandeights888"; //Croquet.App.autoPassword();
Croquet.Session.join({apiKey: apiKey, appId: appId, name: name, password: password, model: PokerModel, view: PokerTable});
