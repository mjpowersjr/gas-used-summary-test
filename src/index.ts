import process from 'process';
import { ethers, BigNumber } from 'ethers';

async function main(args: string[]) {
    if (args.length !== 2) {
        throw new Error(`usage: index.js <rpc-endpoint-url> <txn-hash>`);
    }
    const rpcEndpoint = args[0];
    const txnHash = args[1];

    // collect txn data
    const provider = new ethers.providers.JsonRpcProvider(rpcEndpoint)
    const txn = await provider.getTransaction(txnHash);
    const txnReceipt = await provider.getTransactionReceipt(txnHash);

    // trace txn
    console.log(`tracing ${txnHash} @ ${txnReceipt.blockNumber}`)
    const traceResponse = await provider.send('trace_call', [
        {
            from: txn.from,
            to: txn.to,
            data: txn.data,
            value: '0x' + txn.value.toString(),
        },
        ['trace'],
        '0x' + txnReceipt.blockNumber.toString(16)
    ]);

    // estimate gas usage
    const txnCost = 21000;
    const dataCost = txn.data.length
        ? 68
        : 4;
    const txnGasOverhead = txnCost + dataCost;

    const gasEstimate = traceResponse.trace
        .reduce((currentGasUsed: BigNumber, step: any) => {
            //console.log(step);

            const additionalGasUsed = step.result
                ? BigNumber.from(step.result.gasUsed)
                : BigNumber.from(0);

            const updatedGasUsed = currentGasUsed.add(additionalGasUsed);
            return updatedGasUsed;
        }, BigNumber.from(txnGasOverhead))


    console.table({
        txnHash,
        gasUsed: txnReceipt.gasUsed.toString(),
        gasEstimate: gasEstimate.toString(),
    })
}


const args = process.argv.slice(2);

main(args).catch((e) => {
    console.error(e);
    process.exit(1);
})
