import React, { useState, useEffect, useRef } from "react";
import {
  Banner,
  Text,
  BlockStack,
  View,
  render,
  TextField,
  Checkbox,
  Button,
  useExtensionCapability,
  useApplyAttributeChange,
  useAttributes,
  useCartLines,
  Spinner,
  useBuyerJourneyIntercept,
  // useBuyerJourneyCompleted,
  useApplyMetafieldsChange,
  useMetafield,
} from "@shopify/checkout-ui-extensions-react";

render("Checkout::Dynamic::Render", () => <App />);

function App() {
  // Set up the checkbox state
  const [useLineupCard, setUseLineupCard] = useState(false);
  const [lineupCardNumber, setLineupCardNumber] = useState("");
  const [validationError, setValidationError] = useState("");
  const [saldoDisponible, setSaldoDisponible] = useState(null);
  const [saldoGastar, setSaldoGastar] = useState(null);
  const [cardAdded, setCardAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCardValueUpdated, setIsCardValueUpdated] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Ref para almacenar el valor mutable de isTimerRunning
  const isTimerRunningRef = useRef(isTimerRunning);
  isTimerRunningRef.current = isTimerRunning;

  //testing
  var loop = 0;

  // Set the entry point for the extension
  const canBlockProgress = useExtensionCapability("block_progress");
  const applyAttributeChange = useApplyAttributeChange();
  // const attributes = useAttributes();
  const cartLines = useCartLines();

  // log the attributes and journey
  // console.log("attributes", attributes);
  // console.log("journey", useBuyerJourneyCompleted());

  // Define the metafield namespace and key
  const metafieldNamespace = "loyalty";
  const metafieldKey = "spiceUpCardNumber";

  // Get a reference to the metafield
  const deliveryInstructions = useMetafield({
    namespace: metafieldNamespace,
    key: metafieldKey,
  });

  // Set a function to handle updating a metafield
  const applyMetafieldsChange = useApplyMetafieldsChange();

  // get the sum of all values into cartLines array in cartLines[].cost.totalAmount.amount
  const subtotal = cartLines.reduce((acc, item) => {
    return acc + item.cost.totalAmount.amount;
  }, 0);

  //Intercept the buyer journey
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && isCardValueUpdated) {
      return {
        behavior: "block",
        reason: "La Tarjeta Lineup Rewards ha actualizado su saldo",
        errors: [
          {
            message: "El saldo de su tarjeta Lineup Rewards ha cambiado",
          },
        ],
      };
    } else {
      return {
        behavior: "allow",
      };
    }
  });

  // Use effect to clear the card number and value when the user unchecks the checkbox
  useEffect(() => {
    setLineupCardNumber("");
    setValidationError("");
    setSaldoDisponible(null);
    setCardAdded(false);
    setIsTimerRunning(false); // stop the timer loop
    applyAttributeChange({
      key: "lineupCardValue",
      type: "updateAttribute",
      value: "null",
    });
  }, [useLineupCard]);

  // function to clear validation errors
  function clearValidationErrors() {
    setValidationError("");
  }

  // function to handle the checkbox change
  async function handleButtonClick() {
    if (useLineupCard) {
      //Start validations
      const regex = /^[0-9]+$/;

      if (lineupCardNumber.trim() === "") {
        setValidationError("Ingresa el número de tarjeta");
        return;
      }

      if (lineupCardNumber.length < 9) {
        setValidationError("La tarjeta debe tener más de 9 dígitos");
        return;
      }

      if (!regex.test(lineupCardNumber)) {
        setValidationError("La tarjeta solo debe contener números");
        return;
      }

      // Add a loading spinner
      setIsLoading(true);

      // Simulate an API call
      const data = await apiCall();

      // Remove the loading spinner
      setIsLoading(false);

      if (data.esValido) {
        const saldo =
          data.saldo >= subtotal ? subtotal.toString() : data.saldo.toString();
        setSaldoDisponible(data.saldo);
        setSaldoGastar(saldo);
        setCardAdded(true);
        clearValidationErrors();

        // adds the value of the card to the attributes
        await applyAttributeChange({
          key: "lineupCardValue",
          type: "updateAttribute",
          value: saldo,
        });

        // Apply the change to the metafield
        await applyMetafieldsChange({
          type: "updateMetafield",
          namespace: metafieldNamespace,
          key: metafieldKey,
          valueType: "string",
          value: lineupCardNumber,
        });

        //----------------------Timer----------------------//

        // Set the flag to start the timer
        setIsTimerRunning(true);

        // Start the timer loop
        startTimerLoop();
      } else {
        setValidationError(
          "El número de la tarjeta Lineup Rewards es inválido"
        );
      }
    }
  }

  // Simulate an API call
  async function apiCall() {
    return {
      esValido: true,
      saldo: 2000,
    };
  }

  // Function to start the timer loop
  async function startTimerLoop() {
    let previousSaldo = saldoDisponible;

    //testing
    loop = 0;

    // Start the timer loop
    while (isTimerRunningRef.current) {
      await sleep(5000); // Wait for 5 seconds / 30Seconds

      //testing
      console.log("loop", loop);
      if (loop === 3) {
        setIsCardValueUpdated(true);
        setIsTimerRunning(false);
        break;
      }

      const updatedData = await apiCall();
      const updatedSaldo =
        updatedData.saldo >= subtotal
          ? subtotal.toString()
          : updatedData.saldo.toString();
      setSaldoDisponible(updatedData.saldo);
      setSaldoGastar(updatedSaldo);

      if (updatedData.saldo !== previousSaldo) {
        console.log("saldo actualizado");
        // Update the attribute value and metafield with the updated card value
        await applyAttributeChange({
          key: "lineupCardValue",
          type: "updateAttribute",
          value: updatedSaldo,
        });

        await applyMetafieldsChange({
          type: "updateMetafield",
          namespace: metafieldNamespace,
          key: metafieldKey,
          valueType: "string",
          value: lineupCardNumber,
        });
        setIsCardValueUpdated(true);
        setIsTimerRunning(false);
        break;
      }

      loop++;
      previousSaldo = updatedData.saldo;

      // Wait for the next iteration
      await Promise.resolve();
    }
  }

  // Utility function to sleep for a specified amount of time
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // function to handle the remove card button
  function handleRemoveCard() {
    setCardAdded(false);
    setSaldoDisponible(null);
    setLineupCardNumber("");
    setIsTimerRunning(false); // stop the timer loop
    applyAttributeChange({
      key: "lineupCardValue",
      type: "updateAttribute",
      value: "null",
    });
    // Apply the change to the metafield
    applyMetafieldsChange({
      type: "updateMetafield",
      namespace: metafieldNamespace,
      key: metafieldKey,
      valueType: "string",
      value: "",
    });
  }

  // Return the JSX to render
  return (
    <BlockStack>
      <View padding="base">
        <Banner status="info">
          <Checkbox
            checked={useLineupCard}
            onChange={setUseLineupCard}
            disabled={isLoading ? true : false}
          >
            {useLineupCard
              ? "Eliminar tarjeta Lineup Rewards"
              : "Usar tarjeta Lineup Rewards para obtener un descuento"}
          </Checkbox>
        </Banner>
      </View>
      {useLineupCard && (
        <BlockStack spacing="base">
          {!cardAdded && (
            <BlockStack spacing="base">
              <TextField
                label="Número de tarjeta Lineup Rewards"
                value={lineupCardNumber}
                onChange={setLineupCardNumber}
                onInput={clearValidationErrors}
                required={canBlockProgress}
                disabled={isLoading ? true : false}
                error={validationError}
              />
              <Button
                disabled={isLoading ? true : false}
                onPress={handleButtonClick}
              >
                Agregar tarjeta lineup para esta compra
              </Button>
              {isLoading && <Spinner />} {/* Loader */}
            </BlockStack>
          )}
          {saldoDisponible !== null && cardAdded && (
            <Banner
              status={!isCardValueUpdated ? "success" : "warning"}
              title="Tarjeta Lineup Rewards Agregada"
            >
              <BlockStack>
                <Text>Número de tarjeta: {deliveryInstructions?.value}</Text>
                <Text>Saldo disponible en la tarjeta: ${saldoDisponible}</Text>
                <Text appearance="info">
                  Valor de la tarjeta a utilizar en la compra: $ {saldoGastar}
                </Text>
                <Button kind="secondary" onPress={handleRemoveCard}>
                  Eliminar Tarjeta
                </Button>
              </BlockStack>
            </Banner>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}

export default App;
