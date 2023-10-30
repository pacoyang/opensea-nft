#![cfg_attr(not(feature = "std"), no_std, no_main)]
extern crate alloc;

use pink_extension as pink;

#[ink::contract(env = pink::PinkEnvironment)]
mod phala_nft_collection {
    use super::pink;
    use alloc::format;
    use alloc::string::String;
    use alloc::vec;
    use alloc::vec::Vec;
    use ink::storage::traits::StorageLayout;
    use ink::storage::Mapping;
    use phat_js;
    use pink_extension::ResultExt;
    use scale::{Decode, Encode};
    use serde::Deserialize;

    #[ink(storage)]
    pub struct PhalaNftCollection {
        owner: AccountId,
        name: String,
        description: String,
        total_nfts: u32,
        nfts: Mapping<u32, Nft>,
        compute_formula: Option<String>,
    }

    #[derive(Decode, Encode)]
    #[cfg_attr(
        feature = "std",
        derive(Debug, PartialEq, Eq, scale_info::TypeInfo, StorageLayout)
    )]
    pub struct Nft {
        owner: AccountId,
        id: u32,
        lv: u32,
        exp: u32,
    }

    #[derive(Decode, Encode)]
    #[cfg_attr(
        feature = "std",
        derive(Debug, PartialEq, Eq, scale_info::TypeInfo, StorageLayout)
    )]
    pub struct NftAttribtue {
        trait_type: String,
        value: String,
    }

    #[derive(Decode, Encode)]
    #[cfg_attr(
        feature = "std",
        derive(Debug, PartialEq, Eq, scale_info::TypeInfo, StorageLayout)
    )]
    pub struct NftMetadata {
        name: String,
        description: String,
        external_url: String,
        image: String,
        attributes: Vec<NftAttribtue>,
    }

    #[derive(Debug, Deserialize)]
    struct ComputeResult {
        energy: u32,
    }

    #[derive(Debug, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        TokenNotFound,
        TokenOwned,
        NotReady,
        NotCollectionOwner,
        NotNftOwner,
        ComputeFailure,
    }

    #[derive(Deserialize, Encode, Clone, Debug, PartialEq)]
    pub struct OwnerResponse<'a> {
        owner: &'a str,
    }

    impl PhalaNftCollection {
        #[ink(constructor)]
        pub fn create(name: String, description: Option<String>) -> Self {
            Self {
                name: name.clone(),
                description: description.unwrap_or(String::from("")),
                owner: Self::env().caller(),
                nfts: Mapping::new(),
                total_nfts: 0,
                compute_formula: None,
            }
        }

        #[ink(message)]
        pub fn get_collection_name(&self) -> String {
            let val = self.name.clone();
            return val;
        }

        #[ink(message)]
        pub fn set_collection_name(&mut self, name: String) {
            if self.owner != Self::env().caller() {
                panic!("Only collection owner can set collection name")
            }
            self.name = name;
        }

        #[ink(message)]
        pub fn get_collection_description(&self) -> String {
            let val = self.description.clone();
            return val;
        }

        #[ink(message)]
        pub fn set_collection_description(&mut self, description: String) {
            if self.owner != Self::env().caller() {
                panic!("Only collection owner can set collection description")
            }
            self.description = description;
        }

        #[ink(message)]
        pub fn get_collection_onwer(&self) -> AccountId {
            return self.owner.clone();
        }

        #[ink(message)]
        pub fn set_compute_formula(&mut self, formula: String) -> Result<Option<String>, Error> {
            if Self::env().caller() != self.owner {
                return Err(Error::NotCollectionOwner);
            }
            self.compute_formula = Some(formula);
            Ok(self.compute_formula.clone())
        }

        #[ink(message)]
        pub fn get_compute_formula(&self) -> Result<Option<String>, Error> {
            return Ok(self.compute_formula.clone());
        }

        #[ink(message)]
        pub fn mint(&mut self, token_id: u32, account: AccountId) -> Result<u32, Error> {
            // check collection owner
            if self.owner != Self::env().caller() {
                return Err(Error::NotCollectionOwner);
            }
            // check if token has been claimed
            let existed = self.nfts.get(&token_id);
            if let Some(_) = existed {
                return Err(Error::TokenOwned);
            }
            let nft = Nft {
                id: token_id,
                owner: account,
                lv: 0,
                exp: 0,
            };
            self.nfts.insert(token_id, &nft);
            self.total_nfts += 1;
            Ok(token_id)
        }

        #[ink(message)]
        pub fn tick(&mut self, token_id: u32, account: AccountId) -> Result<u32, Error> {
            if self.owner != Self::env().caller() {
                return Err(Error::NotCollectionOwner);
            }
            let mut nft = self.nfts.get(&token_id).ok_or(Error::TokenNotFound)?;
            if nft.owner != account {
                return Err(Error::NotNftOwner);
            }
            nft.exp += 1;
            self.nfts.insert(token_id, &nft);
            Ok(nft.exp)
        }

        #[ink(message)]
        pub fn levelup(&mut self, token_id: u32, account: AccountId) -> Result<u32, Error> {
            if self.owner != Self::env().caller() {
                return Err(Error::NotCollectionOwner);
            }
            let mut nft = self.nfts.get(&token_id).ok_or(Error::TokenNotFound)?;
            if nft.owner != account {
                return Err(Error::NotNftOwner);
            }
            nft.lv += 1;
            nft.exp = 0;
            self.nfts.insert(token_id, &nft);
            Ok(nft.lv)
        }

        #[ink(message)]
        pub fn get_nft_metadata(&self, token_id: u32) -> Result<NftMetadata, Error> {
            let nft = self.nfts.get(&token_id).ok_or(Error::TokenNotFound)?;
            let mut attrs: Vec<NftAttribtue> = vec![];
            attrs.push(NftAttribtue {
                trait_type: String::from("owner"),
                value: format!("{}", hex::encode(nft.owner)),
            });
            attrs.push(NftAttribtue {
                trait_type: String::from("lv"),
                value: format!("{}", nft.lv),
            });
            attrs.push(NftAttribtue {
                trait_type: String::from("exp"),
                value: format!("{}", nft.exp),
            });
            if self.compute_formula.is_some() {
                let compute_formula = self.compute_formula.clone().unwrap();
                let js_code = format!(
                    r#"
                    const nft = {{
                        lv: {},
                        exp: {},
                    }};
                    {}
                "#,
                    nft.lv, nft.exp, compute_formula
                );
                pink::debug!("js_code: {}", js_code);
                let result_raw = self.get_js_result(js_code, vec![])?;
                pink::debug!("result_raw: {}", result_raw);
                let result_u8: Vec<u8> = result_raw.as_bytes().to_vec();
                let result: ComputeResult = serde_json_core::from_slice(&*result_u8)
                    .or(Err(Error::ComputeFailure))?
                    .0;
                pink::debug!("result: {:?}", result);
                attrs.push(NftAttribtue {
                    trait_type: String::from("energy"),
                    value: format!("{}", result.energy),
                });
            }
            Ok(NftMetadata {
                name: format!("{} #{}", self.name, token_id),
                description: self.description.clone(),
                external_url: String::from(""),
                image: String::from(""),
                attributes: attrs,
            })
        }

        fn get_js_result(&self, js_code: String, args: Vec<String>) -> Result<String, Error> {
            let output = phat_js::eval(&js_code, &args)
                .log_err("Failed to run js")
                .unwrap();
            let output_as_bytes = match output {
                phat_js::Output::String(s) => s.into_bytes(),
                phat_js::Output::Bytes(b) => b,
            };
            Ok(String::from_utf8(output_as_bytes).unwrap())
        }
    }

    #[cfg(test)]
    mod tests {

        use super::*;

        #[ink::test]
        fn it_works() {
            pink_extension_runtime::mock_ext::mock_all_ext();
            let mut collection = PhalaNftCollection::create(
                String::from("NFT Collection"),
                Some(String::from("description")),
            );
            assert_eq!(
                collection.get_collection_name(),
                String::from("NFT Collection")
            );
            let account = ink_e2e::account_id(ink_e2e::AccountKeyring::Alice);
            let id = collection.mint(0, account.clone());
            assert_eq!(id.unwrap(), 0);
            let metadata = collection.get_nft_metadata(0);
            assert_eq!(metadata.unwrap().name, String::from("NFT Collection #0"));
        }
    }

    #[cfg(all(test, feature = "e2e-tests"))]
    mod e2e_tests {
        use super::*;

        use ink_e2e::build_message;

        type E2EResult<T> = std::result::Result<T, Box<dyn std::error::Error>>;

        #[ink_e2e::test]
        async fn it_works(mut client: ink_e2e::Client<C, E>) -> E2EResult<()> {
            Ok(())
        }
    }
}
