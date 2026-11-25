{
  description = "akshat.dev development shell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = {nixpkgs, ...}: let
    systems = ["aarch64-darwin" "x86_64-linux" "aarch64-linux"];
    forAll = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
  in {
    devShells = forAll (pkgs: {
      default = pkgs.mkShellNoCC {
        packages = [pkgs.bun pkgs.nodejs_26];
        NEXT_TELEMETRY_DISABLED = "1";
        WRANGLER_SEND_METRICS = "false";
      };
    });

    formatter = forAll (pkgs: pkgs.alejandra);
  };
}
