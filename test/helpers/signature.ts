import { BigNumberish, JsonRpcProvider, MaxUint256, Signature, Signer } from "ethers";
import { ethers } from "hardhat";

import { ERC20Permit } from "../../typechain-types";

export async function getPermitSignature(
  signer: Signer,
  token: ERC20Permit,
  spender: string,
  value: BigNumberish = MaxUint256,
  deadline: BigNumberish = MaxUint256,
  permitConfig?: { nonce?: BigNumberish; name?: string; chainId?: number; version?: string },
): Promise<Signature> {
  const [nonce, name, version, chainId] = [
    permitConfig?.nonce ?? (await token.nonces(await signer.getAddress())),
    permitConfig?.name ?? (await token.name()),
    permitConfig?.version ?? "1",
    permitConfig?.chainId ?? (await ethers.provider.getNetwork()).chainId,
  ];

  return ethers.Signature.from(
    await signer.signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: await token.getAddress(),
      },
      {
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      },
      {
        owner: await signer.getAddress(),
        spender,
        value,
        nonce,
        deadline,
      },
    ),
  );
}
