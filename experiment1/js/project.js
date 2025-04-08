// project.js - purpose and description here
// Author: Your Name
// Date:

// NOTE: This is how we might start a basic JavaaScript OOP project

// Constants - User-servicable parts
// In a longer project I like to put these in a separate file

// define a class
class MyProjectClass {
  // constructor function
  constructor(param1, param2) {
    // set properties using 'this' keyword
    this.property1 = param1;
    this.property2 = param2;
  }
  
  // define a method
  myMethod() {
    // code to run when method is called
  }
}

function main() {
  // create an instance of the class
  let myInstance = new MyProjectClass("value1", "value2");

  // call a method on the instance
  myInstance.myMethod();
}

// let's get this party started - uncomment me
main();

const fillers = {
  crafter: ["Dude", "Bro", "Steve", "Alex", "Minin'", "Blockhead"],
  salutation: ["Yo", "Listen up", "Heads up", "Behold", "Oi"],
  material: ["dirt", "cobblestone", "rotten stick", "mossy cobblestone", "stale bread", "mysterious blob"],
  quantity: ["one", "two", "three", "a couple of", "an absurd amount of"],
  tool: ["pickaxe", "sword", "shovel", "axe", "hoe"],
  quality: ["crappy", "shitty", "laggy", "glitchy", "disastrous"],
  action: ["smash", "combine", "pile", "waste", "squish"],
};

const template = `$crafter, $salutation!

To craft a $quality $tool in Minecraft, you must first $action $quantity $material and then $action another $quantity $material on a crafting table.
Place them in a bungled pattern that defies logic, and pray to the pixel gods for a half-decent result.
But chances are—your crafted item will be so $quality, even Creepers will laugh at it!`;



// STUDENTS: You don't need to edit code below this line.

const slotPattern = /\$(\w+)/;

function replacer(match, name) {
  let options = fillers[name];
  if (options) {
    return options[Math.floor(Math.random() * options.length)];
  } else {
    return `<UNKNOWN:${name}>`;
  }
}

function generate() {
  let story = template;
  while (story.match(slotPattern)) {
    story = story.replace(slotPattern, replacer);
  }

  /* global box */
  box.innerText = story;
}

/* global clicker */
clicker.onclick = generate;

generate();
