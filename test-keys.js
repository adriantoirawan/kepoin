process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', (b) => {
  console.log(JSON.stringify(b.toString()));
  if (b.toString() === 'q') process.exit();
});
