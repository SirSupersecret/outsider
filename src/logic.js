const provider = new ethers.providers.Web3Provider(window.ethereum)
const outsiderABI = [
  "function isEOA(address) view returns (bool)",
  "function proofEOA(address _subject, bytes _sig)",
  "event ProofOfEOA(address subject)"
]
const outsiderContract = new ethers.Contract("0xf074B8600EcF65FaDbb33f75026A3a479257C34D", outsiderABI, provider);

let signer;
let sig;

document.addEventListener('alpine:init', () => {
  Alpine.data('interactive', () => ({
    progress: 0,
    state: "unknown",
    readable: "Connect your wallet to check your EOA status.",

    setStates(newVal) {
      this.state = newVal;

      switch(newVal) {
        case "true":
          this.readable = "This account is registered as EOA.";
          break;
        case "false":
          this.readable = "This account is not registered as EOA";
          break;
        case "unsupported":
          this.readable = "Outsider does not yet support this chain.";
          break;
        case "waiting":
          this.readable = "Your request is currently processed."
          break;
      }
    },

    async connect() {
      await provider.send("eth_requestAccounts", []);
      signer = await provider.getSigner();

      if(signer) {
        let isEOA;
        try {
          isEOA = await outsiderContract.isEOA(await signer.getAddress());
        } catch(e) {
          alert("Outsider is not yet deployed on this chain.");
          this.setStates("unsupported");
          this.progress = 3;
          return;
        }

        if(isEOA) {
          this.setStates("true");
          this.progress = 2;
        } else {
          this.setStates("false");
          this.progress = 1;
        }
      }
    },

    async sign() {
      sig = await signer.signMessage(
        ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(
            ["string"],
            ["I am worthy."]
          )
        )
      );

      if(sig) {
        this.progress = 2;
      }
    },

    async submit() {
      const outsiderWithSigner = outsiderContract.connect(signer);
      this.progress = 3;
      try {
        const tx = await outsiderWithSigner.proofEOA(await signer.getAddress(), sig);
        console.log(tx.hash)
        this.setStates("waiting");
        const receipt = await tx.wait();
        this.setStates("true");
        console.log(receipt)
      } catch (e) {
        console.log(e)
        this.progress = 2;
      }
    }
  }))
})