import { Component, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Note {
  name: string;
  freq: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnDestroy {
  @ViewChild('noteSelector') noteSelector!: ElementRef;
  
  showNoteMenu: boolean = false;

  notes: Note[] = [];
  noteNames: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  octaves: number[] = [3, 4, 5];
  selectedFreq: number = 440; // A4
  selectedNote: string = 'A4';
  selectedNoteIndex: number = 0;
  selectedOctave: number = 4;
  volume: number = 0.5;
  isPlaying: boolean = false;

  private audioCtx!: AudioContext;
  private oscillator!: OscillatorNode;
  private gainNode!: GainNode;

  constructor() {
    this.generateNotes();
    // Initialize to A4
    const a4Index = this.notes.findIndex(n => n.name === 'A4');
    if (a4Index !== -1) {
      this.selectedNoteIndex = a4Index;
      this.selectedNote = this.notes[a4Index].name;
      this.selectedFreq = this.notes[a4Index].freq;
      this.selectedOctave = 4;
    }
  }

  getNotesForOctave(octave: number): Note[] {
    return this.notes.filter(n => n.name.endsWith(octave.toString()));
  }

  selectNoteByName(noteName: string, octave: number) {
    const fullNoteName = `${noteName}${octave}`;
    const noteIndex = this.notes.findIndex(n => n.name === fullNoteName);
    if (noteIndex !== -1) {
      this.selectedNoteIndex = noteIndex;
      this.selectedNote = this.notes[noteIndex].name;
      this.selectedFreq = this.notes[noteIndex].freq;
      this.selectedOctave = octave;
      if (this.isPlaying) {
        this.play();
      }
    }
  }

  selectOctave(octave: number) {
    this.selectedOctave = octave;
  }

  private generateNotes() {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octaves = [3, 4, 5]; // quelques octaves
    this.notes = [];

    octaves.forEach(oct => {
      noteNames.forEach((name, i) => {
        // A4 (octave 4, index 9 dans noteNames) = position 48 depuis C0
        // Pour chaque octave, ajouter 12 demi-tons
        // Pour chaque note, ajouter son index dans le tableau
        const n = i + oct * 12;
        // A4 est à n=57, mais on veut que A4=440Hz qui correspond à n=48
        // Donc on utilise n - 9 pour A4 (position 9 dans le tableau)
        const freq = 440 * Math.pow(2, (n - 57) / 12);
        this.notes.push({ name: `${name}${oct}`, freq });
      });
    });
  }

  play() {
    this.stop(); // stop note précédente

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(this.selectedFreq, this.audioCtx.currentTime);

    this.gainNode.gain.value = this.volume;

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    this.oscillator.start();
    this.isPlaying = true;
  }

  stop() {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    this.isPlaying = false;
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  updateVolume() {
    if (this.gainNode && this.isPlaying) {
      this.gainNode.gain.value = this.volume;
    }
  }

  onFreqChange() {
    // stop ancienne note si elle joue
    if (this.oscillator) {
      this.oscillator.frequency.setValueAtTime(this.selectedFreq, this.audioCtx.currentTime);
    }
    this.selectedNote = this.getClosestNote(this.selectedFreq);
  }

  previousNote() {
    if (this.selectedNoteIndex > 0) {
      this.selectedNoteIndex--;
      this.updateNoteFromIndex();
    }
  }

  nextNote() {
    if (this.selectedNoteIndex < this.notes.length - 1) {
      this.selectedNoteIndex++;
      this.updateNoteFromIndex();
    }
  }

  private updateNoteFromIndex() {
    const note = this.notes[this.selectedNoteIndex];
    this.selectedFreq = note.freq;
    this.selectedNote = note.name;
    this.selectedOctave = parseInt(note.name[note.name.length - 1]);
    if (this.isPlaying) {
      this.play();
    }
  }

  onNoteChange(note: Note) {
    this.selectedFreq = note.freq;
    this.selectedNote = note.name;
    this.play();
  }

  onVolumeInput(event: any) {
    this.volume = event.target.value / 100;
    this.updateVolume();
  }

  private getClosestNote(freq: number): string {
    let closest = this.notes[0];
    let minDiff = Math.abs(freq - closest.freq);
    this.notes.forEach(n => {
      const diff = Math.abs(freq - n.freq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = n;
      }
    });
    return closest.name;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.noteSelector && !this.noteSelector.nativeElement.contains(event.target)) {
      this.showNoteMenu = false;
    }
  }

  ngOnDestroy() {
    this.stop();
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}