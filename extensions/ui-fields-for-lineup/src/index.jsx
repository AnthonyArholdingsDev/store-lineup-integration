import React, { useState, useEffect } from "react";
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
  useBuyerJourneyIntercept,
} from "@shopify/checkout-ui-extensions-react";

render("Checkout::Contact::RenderAfter", () => <App />);

function App() {
  const [useLineupCard, setUseLineupCard] = useState(false);
  const [lineupCardNumber, setLineupCardNumber] = useState("");
  const [validationError, setValidationError] = useState("");
  const [saldoDisponible, setSaldoDisponible] = useState(null);
  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState(null);
  const [cardAdded, setCardAdded] = useState(false);

  const canBlockProgress = useExtensionCapability("block_progress");

  useEffect(() => {
    setLineupCardNumber("");
    setValidationError("");
    setSaldoDisponible(null);
    setCardAdded(false);
  }, [useLineupCard]);

  function clearValidationErrors() {
    setValidationError("");
  }

  function handleButtonClick() {
    if (useLineupCard) {
      // fetch(`https://tu-api.com/validar?numero=${lineupCardNumber}`)
      //   .then((response) => response.json())
      //   .then((data) => {

      //   });
      const data = {
        esValido: true,
        saldo: 100,
      };
      if (data.esValido) {
        setSaldoDisponible(data.saldo);
        setCardAdded(true);
        clearValidationErrors();
      } else {
        setValidationError("El número de la tarjeta lineup es inválido");
      }
    }
  }

  function handleRemoveCard() {
    setCardAdded(false);
    setSaldoDisponible(null);
    setLineupCardNumber("");
  }

  return (
    <BlockStack>
      <View padding="base">
        <Checkbox checked={useLineupCard} onChange={setUseLineupCard}>
          {useLineupCard ? "Eliminar tarjeta lineup" : "Usar tarjeta lineup"}
        </Checkbox>
      </View>
      {useLineupCard && (
        <BlockStack spacing="base">
          {!cardAdded && (
            <BlockStack spacing="base">
              <TextField
                label="Número de la tarjeta lineup"
                value={lineupCardNumber}
                onChange={setLineupCardNumber}
                onInput={clearValidationErrors}
                required={canBlockProgress}
                error={validationError}
              />
              <Button onPress={handleButtonClick}>
                Agregar tarjeta lineup para esta compra
              </Button>
            </BlockStack>
          )}
          {saldoDisponible !== null && cardAdded && (
            <Banner status="info" title="Tarjeta Lineup Agregada">
              <BlockStack>
                <Text>Número de tarjeta: {lineupCardNumber}</Text>
                <Text>Saldo disponible en la tarjeta: ${saldoDisponible}</Text>
                <Text appearance="info">
                  El 100% del valor de la tarjeta se ha aplicado a la compra
                  actual.
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
