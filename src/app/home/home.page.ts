//probar de hacer split de cartas iguales
//arreglar el pago por blackjack natural que es 3:2 y no 1:1 (apuestas 100 ganas 150)
//verificar As
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { IonContent, IonButton, IonCardContent, IonCard, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonButton, IonCardContent, IonCard, IonIcon],
})

export class HomePage {

  deckId: string = '';
  playerCards: any[] = [];
  crupierCards: any[] = []; 
  crupierOcultar: boolean = false;



  balance: number = 1000;
  apuesta_actual: number = 0
  wins: number = 0;
  losses: number = 0
  partidas_jugadas: number = 0;
  partida_en_curso: boolean = false;

  constructor(private http: HttpClient, private toastController: ToastController) { }

  async ngOnInit() {
    this.loadState();
    await this.crear_mazo();
  }

  async crear_mazo() {

    const response = await this.http.get<any>('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1').toPromise();
    this.deckId = response.deck_id;
  }

  async drawCards(count: number) {
    const response = await this.http.get<any>(`https://www.deckofcardsapi.com/api/deck/${this.deckId}/draw/?count=${count}`).toPromise();
    return response.cards;

    /*
    response.cards.forEach((card: any) => {

      let cardValue = this.valorcarta(card.value);

      if (hand === this.playerCards) {
        if (cardValue === 11 && this.playerScore + 11 > 21) {// condicion por si le toca dos as (2 cartas con valor de 11 cambiar a 1 una carta)
          this.playerScore += 1;
        } else {
          this.playerScore += cardValue;
        }

      } else {
        if (cardValue === 11 && this.crupierScore + 11 > 21) {// condicion por si le toca dos as (2 cartas con valor de 11 cambiar a 1 una carta)
          this.crupierScore += 1;
        } else {
          this.crupierScore += cardValue;
        }
      }
    });
    */
  }

  async ponerApuesta(cantidad: number) { //no deja apostar todo
    if (!this.partida_en_curso && cantidad > 0) {
      if (cantidad <= this.balance) {
        this.apuesta_actual += cantidad;
        this.balance -= cantidad;
      } else {
        const toast = await this.toastController.create({
          message: 'No tienes suficiente balance para esa apuesta',
          duration: 1500,
          position: 'top',
        });
        await toast.present();
      }
    }
  }

  async repartir() {
    if (this.apuesta_actual === 0) {
      const toast = await this.toastController.create({
        message: 'No puedes jugar sin apostar',
        duration: 1500,
        position: 'top',
      });

      await toast.present();
      return;
    };

    this.playerCards = await this.drawCards(2);
    this.crupierCards = await this.drawCards(2);
    this.crupierOcultar = true;
    this.partida_en_curso = true;
    console.log(this.playerCards, this.crupierCards)

    //com0probar si hay blackjack natural, 
    let playerTotal = this.calculateTotal(this.playerCards);
    let crupierTotal = this.calculateTotal(this.crupierCards);
    let playerNatural = playerTotal == 21 && this.playerCards.length == 2;
    let crupierNatural = crupierTotal == 21 && this.crupierCards.length == 2;
    console.log(playerNatural)
    if (playerNatural || crupierNatural) {
      this.crupierOcultar = false;
      if (playerNatural && !crupierNatural) {
        await this.hasganado(true, 'top')
        return;
      } else if (!playerNatural && crupierNatural) {
        await this.hasperdido(false, 'top')
        return;
      } else if (playerNatural && crupierNatural) {
        await this.empate(null, 'top')
        return;
      }
    }
  }

  async hit() {
    this.playerCards.push(...await this.drawCards(1));
    if (this.calculateTotal(this.playerCards) > 21) {
      this.hasperdido(false, 'top')
    }
  }


  async doubleDown() {

    if (this.playerCards.length === 2 && this.apuesta_actual <= this.balance) {
      this.balance -= this.apuesta_actual;
      this.apuesta_actual *= 2;
      this.playerCards.push(...await this.drawCards(1));
      if (this.calculateTotal(this.playerCards) > 21) {
        this.hasperdido(false, 'top')
      } else {
        await this.stand();
      }
    } else {  
      const toast = await this.toastController.create({
        message: 'No puedes doblar la apuesta',
        duration: 1500,
        position: 'top',
      });
      await toast.present();
    }
  }


  async stand() {
    this.crupierOcultar = false;

    while (this.calculateTotal(this.crupierCards) < this.calculateTotal(this.playerCards) && this.calculateTotal(this.crupierCards) < 21) { //mirar si hay empates
      this.crupierCards.push(...await this.drawCards(1));
    }

    let playerTotal = this.calculateTotal(this.playerCards);
    let crupierTotal = this.calculateTotal(this.crupierCards);

    if (crupierTotal > 21 || playerTotal > crupierTotal) {
      this.hasganado(true, 'top')
    } else if (playerTotal < crupierTotal) {
      this.hasperdido(false, 'top')
    } else {
      this.empate(null, 'top')
    }
  }

  calculateVisibleTotal(): number {
    if (!this.crupierCards || this.crupierCards.length === 0) return 0;


    let visibleCards = this.crupierOcultar ? this.crupierCards.slice(1) : this.crupierCards;
    return this.calculateTotal(visibleCards);
  }

  calculateTotal(cards: any[]): number {
    let total = 0;
    let aces = 0;

    for (let card of cards) {
      if (['KING', 'QUEEN', 'JACK'].includes(card.value)) {
        total += 10;
      } else if (card.value === 'ACE') {
        total += 11;
        aces++;
      } else {
        total += parseInt(card.value);
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
  }

  /*
  valorcarta(value: string): number {
    if (['KING', 'QUEEN', 'JACK'].includes(value)) {
      return 10;
    } else if (value === 'ACE') {
      return 11;
    } else {
      return parseInt(value);
    }
  }

  async pedir() {
    await this.repartir(1, this.playerCards);
    if (this.playerScore > 21) {
      this.hasperdido('top')
      this.ocultarBotones = false
    }
  }

  async plantarse() {
    this.ocultarBotones = false
    // El crupier pide cartas hasta igualar o superar el puntaje del jugador, o hasta que se pase de 21
    while (this.crupierScore <= this.playerScore && this.crupierScore < 21) {
      await this.repartir(1, this.crupierCards);
    }

    if (this.crupierScore > 21) {
      this.hasganado('top')
    } else if (this.crupierScore == 21 && this.playerScore == 21) {
      this.empate('top')
    } else {
      this.hasperdido('top')
    }



  }

  reiniciar() {
    this.playerCards = [];
    this.crupierCards = [];
    this.playerScore = 0;
    this.crupierScore = 0;
    this.ocultarBotones = true
    this.crear_mazo();
  }
  */
  async hasganado(playerWon: boolean | null, position: 'top') {
    this.partidas_jugadas++;

    if (playerWon === true) {
      this.balance += this.apuesta_actual * 2;
      this.wins++;

    } else if (playerWon === false) {
      this.balance -= this.apuesta_actual;
    }

    this.apuesta_actual = 0;
    this.partida_en_curso = false;
    this.saveState();

    const toast = await this.toastController.create({
      message: 'Has ganado',
      duration: 1500,
      position: position,
    });

    await toast.present();
  }

  async hasperdido(playerWon: boolean | null, position: 'top') {
    this.partidas_jugadas++;

    if (playerWon === true) {
      this.balance += this.apuesta_actual;
      this.wins++;

    }

    this.apuesta_actual = 0;
    this.partida_en_curso = false;
    this.saveState();
    const toast = await this.toastController.create({
      message: 'Has Perdido',
      duration: 1500,
      position: position,
    });

    await toast.present();
  }

  async empate(playerWon: boolean | null, position: 'top') {
    this.partidas_jugadas++;

    if (playerWon === true) {
      this.balance += this.apuesta_actual;
      this.wins++;

    } else if (playerWon === false) {
      this.balance -= this.apuesta_actual;
    }

    this.apuesta_actual = 0;
    this.partida_en_curso = false;
    this.saveState();
    const toast = await this.toastController.create({
      message: 'Es un empate',
      duration: 1500,
      position: position,
    });

    await toast.present();
  }

  saveState() {
    const state = {
      balance: this.balance,
      wins: this.wins,
      partidas_jugadas: this.partidas_jugadas
    };
    localStorage.setItem('blackjack_state', JSON.stringify(state));
  }

  loadState() {
    const data = localStorage.getItem('blackjack_state');
    if (data) {
      const state = JSON.parse(data);
      this.balance = state.balance;
      this.wins = state.wins;
      this.partidas_jugadas = state.partidas_jugadas;
    }
  }

  reiniciar() { //ahora no se utiliza
    this.playerCards = [];
    this.crupierCards = [];
    this.apuesta_actual = 0;
    this.partida_en_curso = false;
    this.crupierOcultar = false;
    this.balance += 10;
  }

}

