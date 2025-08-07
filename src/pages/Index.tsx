console.log('=== INDEX PAGE LOADING ===');

const Index = () => {
  console.log('=== INDEX PAGE RENDERING ===');
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">App Test</h1>
      <p>Testing if the app starts without NFC components</p>
    </div>
  );
};

export default Index;
